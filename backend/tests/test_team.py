"""Organization team management — membership, roles and invites.

These are permission boundaries, so the tests care as much about what a caller
*cannot* do as about what they can.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.core.security import create_user_token
from app.models.invite import Invite
from app.models.user import User, UserRole
from tests.conftest import API, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD


async def _member_auth(session_factory, org_id: str, email: str) -> dict[str, str]:
    """Add a plain member to an organization and return their bearer header."""
    async with session_factory() as s:
        user = User(
            email=email,
            password="x",
            organization_id=org_id,
            role=UserRole.member,
        )
        s.add(user)
        await s.commit()
        await s.refresh(user)
        user_id = user.id
    token = create_user_token(user_id, org_id, "member")
    return {"Authorization": f"Bearer {token}"}


async def _seed_org_id(session_factory) -> str:
    async with session_factory() as s:
        user = await s.scalar(select(User).where(User.email == SEED_ADMIN_EMAIL))
        return user.organization_id


# --- Reading ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_team_lists_the_seed_admin(client, auth):
    resp = await client.get(f"{API}/organization/team", headers=auth)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["can_manage"] is True
    assert [m["email"] for m in body["members"]] == [SEED_ADMIN_EMAIL]
    assert body["members"][0]["role"] == "admin"
    assert body["invites"] == []


@pytest.mark.asyncio
async def test_organization_reports_its_member_count(client, auth):
    resp = await client.get(f"{API}/organization", headers=auth)
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Mevratek"
    assert body["member_count"] == 1


@pytest.mark.asyncio
async def test_a_member_sees_the_team_but_cannot_manage_it(
    client, auth, session_factory
):
    org_id = await _seed_org_id(session_factory)
    member = await _member_auth(session_factory, org_id, "member@mevratek.ru")

    resp = await client.get(f"{API}/organization/team", headers=member)
    assert resp.status_code == 200
    body = resp.json()
    assert body["can_manage"] is False
    assert len(body["members"]) == 2
    # Pending invites name people who are not colleagues yet.
    assert body["invites"] == []


@pytest.mark.asyncio
async def test_team_endpoints_require_a_session(anon_client):
    assert (await anon_client.get(f"{API}/organization/team")).status_code == 401
    assert (await anon_client.get(f"{API}/organization")).status_code == 401


# --- Inviting --------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_can_invite_and_the_invite_is_listed(client, auth):
    resp = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "New.Colleague@Example.com", "role": "member"},
        headers=auth,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()

    # The address is normalised, and the link is built for the caller.
    assert body["invite"]["email"] == "new.colleague@example.com"
    assert body["invite"]["role"] == "member"
    assert body["link"].endswith(body["invite"]["token"])
    assert "/invite/" in body["link"]

    team = (await client.get(f"{API}/organization/team", headers=auth)).json()
    assert [i["email"] for i in team["invites"]] == ["new.colleague@example.com"]


@pytest.mark.asyncio
async def test_a_member_cannot_invite(client, auth, session_factory):
    org_id = await _seed_org_id(session_factory)
    member = await _member_auth(session_factory, org_id, "member2@mevratek.ru")

    resp = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "someone@example.com"},
        headers=member,
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_inviting_an_existing_user_is_refused(client, auth):
    resp = await client.post(
        f"{API}/organization/team/invites",
        json={"email": SEED_ADMIN_EMAIL},
        headers=auth,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_re_inviting_replaces_the_pending_invite(client, auth, session_factory):
    first = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "twice@example.com"},
        headers=auth,
    )
    second = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "twice@example.com", "role": "admin"},
        headers=auth,
    )
    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["invite"]["token"] != second.json()["invite"]["token"]

    # One live invite for that address, carrying the newer role.
    async with session_factory() as s:
        rows = list(
            (
                await s.scalars(
                    select(Invite).where(Invite.email == "twice@example.com")
                )
            ).all()
        )
    assert len(rows) == 1
    assert rows[0].role == UserRole.admin


@pytest.mark.asyncio
async def test_an_invalid_address_is_rejected(client, auth):
    resp = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "not-an-address"},
        headers=auth,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_an_invite_can_be_revoked(client, auth):
    created = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "revoke.me@example.com"},
        headers=auth,
    )
    invite_id = created.json()["invite"]["id"]

    revoked = await client.delete(
        f"{API}/organization/team/invites/{invite_id}", headers=auth
    )
    assert revoked.status_code == 200

    team = (await client.get(f"{API}/organization/team", headers=auth)).json()
    assert team["invites"] == []


@pytest.mark.asyncio
async def test_the_invite_flow_ends_in_a_colleague(client, auth, anon_client):
    created = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "joins@example.com", "role": "member"},
        headers=auth,
    )
    token = created.json()["invite"]["token"]

    accepted = await anon_client.post(
        f"{API}/invites/{token}/accept", json={"password": "a-good-password-1"}
    )
    assert accepted.status_code == 200, accepted.text

    team = (await client.get(f"{API}/organization/team", headers=auth)).json()
    emails = {m["email"] for m in team["members"]}
    assert emails == {SEED_ADMIN_EMAIL, "joins@example.com"}
    # A spent invite is no longer pending.
    assert team["invites"] == []


# --- Roles and removal -----------------------------------------------------


@pytest.mark.asyncio
async def test_a_colleague_can_be_promoted_and_demoted(
    client, auth, session_factory
):
    org_id = await _seed_org_id(session_factory)
    await _member_auth(session_factory, org_id, "promote@mevratek.ru")

    team = (await client.get(f"{API}/organization/team", headers=auth)).json()
    target = next(m for m in team["members"] if m["email"] == "promote@mevratek.ru")

    promoted = await client.patch(
        f"{API}/organization/team/members/{target['id']}",
        json={"role": "admin"},
        headers=auth,
    )
    assert promoted.status_code == 200
    assert promoted.json()["role"] == "admin"

    demoted = await client.patch(
        f"{API}/organization/team/members/{target['id']}",
        json={"role": "member"},
        headers=auth,
    )
    assert demoted.status_code == 200
    assert demoted.json()["role"] == "member"


@pytest.mark.asyncio
async def test_a_colleague_can_be_removed(client, auth, session_factory):
    org_id = await _seed_org_id(session_factory)
    await _member_auth(session_factory, org_id, "remove@mevratek.ru")

    team = (await client.get(f"{API}/organization/team", headers=auth)).json()
    target = next(m for m in team["members"] if m["email"] == "remove@mevratek.ru")

    removed = await client.delete(
        f"{API}/organization/team/members/{target['id']}", headers=auth
    )
    assert removed.status_code == 200

    after = (await client.get(f"{API}/organization/team", headers=auth)).json()
    assert [m["email"] for m in after["members"]] == [SEED_ADMIN_EMAIL]


@pytest.mark.asyncio
async def test_you_cannot_remove_yourself(client, auth, session_factory):
    async with session_factory() as s:
        me = await s.scalar(select(User).where(User.email == SEED_ADMIN_EMAIL))
        my_id = me.id

    resp = await client.delete(
        f"{API}/organization/team/members/{my_id}", headers=auth
    )
    assert resp.status_code == 409
    assert "себя" in resp.json()["message"]


@pytest.mark.asyncio
async def test_the_last_administrator_cannot_be_demoted(
    client, auth, session_factory
):
    """Otherwise the organization locks itself out of managing anything."""
    org_id = await _seed_org_id(session_factory)
    member = await _member_auth(session_factory, org_id, "solo@mevratek.ru")

    async with session_factory() as s:
        me = await s.scalar(select(User).where(User.email == SEED_ADMIN_EMAIL))
        my_id = me.id

    # The seed admin is the only admin, so demoting them is refused...
    resp = await client.patch(
        f"{API}/organization/team/members/{my_id}",
        json={"role": "member"},
        headers=auth,
    )
    assert resp.status_code == 409

    # ...but once a colleague is promoted, it is allowed.
    team = (await client.get(f"{API}/organization/team", headers=auth)).json()
    other = next(m for m in team["members"] if m["email"] == "solo@mevratek.ru")
    await client.patch(
        f"{API}/organization/team/members/{other['id']}",
        json={"role": "admin"},
        headers=auth,
    )
    assert (
        await client.patch(
            f"{API}/organization/team/members/{my_id}",
            json={"role": "member"},
            headers=auth,
        )
    ).status_code == 200

    # The demoted admin can no longer manage the team.
    assert (
        await client.post(
            f"{API}/organization/team/invites",
            json={"email": "nope@example.com"},
            headers=auth,
        )
    ).status_code == 401
    assert member  # the promoted colleague still holds the organization


@pytest.mark.asyncio
async def test_a_member_cannot_remove_anyone(client, auth, session_factory):
    org_id = await _seed_org_id(session_factory)
    member = await _member_auth(session_factory, org_id, "nosy@mevratek.ru")

    async with session_factory() as s:
        me = await s.scalar(select(User).where(User.email == SEED_ADMIN_EMAIL))
        my_id = me.id

    resp = await client.delete(
        f"{API}/organization/team/members/{my_id}", headers=member
    )
    assert resp.status_code == 401


# --- Tenant isolation ------------------------------------------------------


@pytest.mark.asyncio
async def test_teams_do_not_leak_across_organizations(
    client, auth, session_factory
):
    from tests.test_auth import _make_second_org

    org_b, auth_b = await _make_second_org(session_factory)

    ours = (await client.get(f"{API}/organization/team", headers=auth)).json()
    theirs = (await client.get(f"{API}/organization/team", headers=auth_b)).json()

    assert [m["email"] for m in ours["members"]] == [SEED_ADMIN_EMAIL]
    assert [m["email"] for m in theirs["members"]] == ["ops@acme.example"]


@pytest.mark.asyncio
async def test_you_cannot_touch_a_member_of_another_organization(
    client, auth, session_factory
):
    from tests.test_auth import _make_second_org

    _org_b, auth_b = await _make_second_org(session_factory)
    theirs = (await client.get(f"{API}/organization/team", headers=auth_b)).json()
    victim = theirs["members"][0]["id"]

    # Reported as missing, not forbidden — this must not confirm the account.
    removed = await client.delete(
        f"{API}/organization/team/members/{victim}", headers=auth
    )
    assert removed.status_code == 404

    promoted = await client.patch(
        f"{API}/organization/team/members/{victim}",
        json={"role": "member"},
        headers=auth,
    )
    assert promoted.status_code == 404


@pytest.mark.asyncio
async def test_you_cannot_revoke_another_organizations_invite(
    client, auth, session_factory
):
    from tests.test_auth import _make_second_org

    _org_b, auth_b = await _make_second_org(session_factory)
    created = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "their.hire@example.com"},
        headers=auth_b,
    )
    invite_id = created.json()["invite"]["id"]

    resp = await client.delete(
        f"{API}/organization/team/invites/{invite_id}", headers=auth
    )
    assert resp.status_code == 404

    # Still live for its owner.
    theirs = (await client.get(f"{API}/organization/team", headers=auth_b)).json()
    assert [i["email"] for i in theirs["invites"]] == ["their.hire@example.com"]


@pytest.mark.asyncio
async def test_an_invited_colleague_lands_in_the_right_organization(
    client, auth, anon_client, session_factory
):
    created = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "scoped@example.com"},
        headers=auth,
    )
    token = created.json()["invite"]["token"]
    await anon_client.post(
        f"{API}/invites/{token}/accept", json={"password": "a-good-password-1"}
    )

    org_id = await _seed_org_id(session_factory)
    async with session_factory() as s:
        joined = await s.scalar(
            select(User).where(User.email == "scoped@example.com")
        )
    assert joined.organization_id == org_id
    assert joined.role == UserRole.member


# --- Mail ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_an_invite_emails_the_colleague(client, auth, mailbox):
    resp = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "mailed@example.com"},
        headers=auth,
    )
    assert resp.status_code == 201
    assert resp.json()["emailed"] is True

    sent = [m for m in mailbox if m["to"] == "mailed@example.com"]
    assert len(sent) == 1
    assert "приглашение" in sent[0]["subject"].lower()
    # The link is the credential, so it has to be in the message.
    assert resp.json()["invite"]["token"] in sent[0]["text"]


@pytest.mark.asyncio
async def test_without_smtp_the_invite_still_works(client, auth):
    """Mail is best-effort: the link in the response is the fallback."""
    resp = await client.post(
        f"{API}/organization/team/invites",
        json={"email": "nomail@example.com"},
        headers=auth,
    )
    assert resp.status_code == 201
    assert resp.json()["emailed"] is False
    assert resp.json()["link"].startswith("http")


@pytest.mark.asyncio
async def test_organization_isolation_holds_for_the_detail_view(
    client, auth, session_factory
):
    from tests.test_auth import _make_second_org

    _org_b, auth_b = await _make_second_org(session_factory)

    ours = (await client.get(f"{API}/organization", headers=auth)).json()
    theirs = (await client.get(f"{API}/organization", headers=auth_b)).json()

    assert ours["name"] == "Mevratek"
    assert theirs["name"] == "Acme Robotics"
    assert ours["id"] != theirs["id"]


# --- Renaming the organization --------------------------------------------


@pytest.mark.asyncio
async def test_an_admin_can_rename_the_organization(client, auth):
    resp = await client.patch(
        f"{API}/organization", json={"name": "  Новое имя  "}, headers=auth
    )
    assert resp.status_code == 200, resp.text
    # Surrounding whitespace is trimmed.
    assert resp.json()["name"] == "Новое имя"

    again = (await client.get(f"{API}/organization", headers=auth)).json()
    assert again["name"] == "Новое имя"


@pytest.mark.asyncio
async def test_a_member_cannot_rename_the_organization(
    client, auth, session_factory
):
    org_id = await _seed_org_id(session_factory)
    member = await _member_auth(session_factory, org_id, "renamer@mevratek.ru")

    resp = await client.patch(
        f"{API}/organization", json={"name": "Hijacked"}, headers=member
    )
    assert resp.status_code == 401

    unchanged = (await client.get(f"{API}/organization", headers=auth)).json()
    assert unchanged["name"] == "Mevratek"


@pytest.mark.asyncio
async def test_an_empty_organization_name_is_refused(client, auth):
    blank = await client.patch(
        f"{API}/organization", json={"name": "   "}, headers=auth
    )
    assert blank.status_code == 409

    empty = await client.patch(f"{API}/organization", json={"name": ""}, headers=auth)
    assert empty.status_code == 422


@pytest.mark.asyncio
async def test_renaming_does_not_touch_another_organization(
    client, auth, session_factory
):
    from tests.test_auth import _make_second_org

    _org_b, auth_b = await _make_second_org(session_factory)
    await client.patch(f"{API}/organization", json={"name": "Ours"}, headers=auth)

    theirs = (await client.get(f"{API}/organization", headers=auth_b)).json()
    assert theirs["name"] == "Acme Robotics"


# --- Deleting your own account --------------------------------------------


@pytest.mark.asyncio
async def test_the_sole_member_is_warned_it_takes_the_organization(client, auth):
    resp = await client.get(f"{API}/auth/account/deletable", headers=auth)
    assert resp.status_code == 200
    body = resp.json()
    assert body["allowed"] is True
    assert body["deletes_organization"] is True


@pytest.mark.asyncio
async def test_the_last_admin_with_colleagues_cannot_delete_themselves(
    client, auth, session_factory
):
    org_id = await _seed_org_id(session_factory)
    await _member_auth(session_factory, org_id, "stays@mevratek.ru")

    preview = (await client.get(f"{API}/auth/account/deletable", headers=auth)).json()
    assert preview["allowed"] is False
    assert preview["deletes_organization"] is False
    assert "администратор" in preview["reason"]

    # And the attempt itself is refused, not just the preview.
    resp = await client.request(
        "DELETE",
        f"{API}/auth/account",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_a_member_can_delete_themselves(client, auth, session_factory):
    org_id = await _seed_org_id(session_factory)
    member = await _member_auth(session_factory, org_id, "leaver@mevratek.ru")

    preview = (
        await client.get(f"{API}/auth/account/deletable", headers=member)
    ).json()
    assert preview["allowed"] is True
    assert preview["deletes_organization"] is False

    resp = await client.request(
        "DELETE",
        f"{API}/auth/account",
        json={"current_password": "x"},
        headers=member,
    )
    # The seeded member's password is not a real hash, so the check fails —
    # which is itself the point: deletion always costs the password.
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_deleting_requires_the_right_password(client, auth):
    resp = await client.request(
        "DELETE",
        f"{API}/auth/account",
        json={"current_password": "not-the-password"},
        headers=auth,
    )
    assert resp.status_code == 401

    still_there = await client.get(f"{API}/auth/me", headers=auth)
    assert still_there.status_code == 200


@pytest.mark.asyncio
async def test_deleting_the_sole_member_removes_the_organization(
    client, auth, rover_payload, session_factory
):
    """The last member takes the tenant with them — devices and all."""
    registered = await client.post(
        f"{API}/robots/register", json=rover_payload, headers=auth
    )
    assert registered.status_code == 201
    org_id = await _seed_org_id(session_factory)

    resp = await client.request(
        "DELETE",
        f"{API}/auth/account",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["organization_deleted"] is True

    async with session_factory() as s:
        from app.models.organization import Organization
        from app.models.robot import Robot

        assert await s.get(Organization, org_id) is None
        # The devices cascade with it rather than being orphaned.
        remaining = list((await s.scalars(select(Robot))).all())
        assert [r for r in remaining if r.organization_id == org_id] == []

    # The session token is dead now.
    assert (await client.get(f"{API}/auth/me", headers=auth)).status_code == 401


@pytest.mark.asyncio
async def test_deleting_needs_a_code_when_mail_is_on(client, auth, mailbox):
    """With SMTP configured, the password alone is not enough."""
    without_code = await client.request(
        "DELETE",
        f"{API}/auth/account",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    assert without_code.status_code == 401
    assert "код" in without_code.json()["message"].lower()

    requested = await client.post(
        f"{API}/auth/account/delete/request",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    assert requested.status_code == 200
    sent = [m for m in mailbox if "удален" in m["subject"].lower()]
    assert len(sent) == 1

    import re

    code = re.search(r"\b(\d{5})\b", sent[0]["text"]).group(1)
    deleted = await client.request(
        "DELETE",
        f"{API}/auth/account",
        json={"current_password": SEED_ADMIN_PASSWORD, "code": code},
        headers=auth,
    )
    assert deleted.status_code == 200, deleted.text


@pytest.mark.asyncio
async def test_no_code_is_sent_when_deletion_would_be_refused(
    client, auth, mailbox, session_factory
):
    org_id = await _seed_org_id(session_factory)
    await _member_auth(session_factory, org_id, "blocker@mevratek.ru")

    resp = await client.post(
        f"{API}/auth/account/delete/request",
        json={"current_password": SEED_ADMIN_PASSWORD},
        headers=auth,
    )
    assert resp.status_code == 409
    assert [m for m in mailbox if "удален" in m["subject"].lower()] == []


@pytest.mark.asyncio
async def test_account_deletion_requires_a_session(anon_client):
    assert (
        await anon_client.get(f"{API}/auth/account/deletable")
    ).status_code == 401
    assert (
        await anon_client.request(
            "DELETE", f"{API}/auth/account", json={"current_password": "x"}
        )
    ).status_code == 401
