# Backup and restore

Mevratek runs inside the customer's perimeter, so backups are the customer's
own responsibility — there is no vendor with a copy of the data. This page says
exactly what to back up, how, and how to prove the backup works.

## What actually has to be backed up

**1. The PostgreSQL database — everything the platform knows.**

Organizations, users and their password hashes, devices and their tokens,
decisions, telemetry, tasks, execution feedback, the audit log, API keys,
invitations, and the newsletter list. Avatars are stored inline in the database
rather than as files, so there is no separate media directory to collect.

**2. The environment — the secrets, which are deliberately *not* in the database.**

`SECRET_KEY`, `ADMIN_TOKEN`, `SMTP_PASSWORD`, the LLM provider keys and
`DATABASE_URL` itself. A database restored without `SECRET_KEY` still holds
every account, but every issued session and device token stops validating, and
every device has to be re-registered. Keep these wherever your organization
keeps secrets — a password manager or a secrets vault, not the backup
directory.

**3. Nothing else.** The application is stateless: containers, images and the
checkout are all reproducible from this repository.

## Taking a backup

```bash
DATABASE_URL=postgresql://user:pass@host:5432/mevratek ops/backup.sh
```

Writes `backups/mevratek-<UTC timestamp>.dump` in PostgreSQL's custom format —
compressed, and restorable table by table.

| Flag | Meaning |
|---|---|
| `--out DIR` | Where to write (default `./backups`, or `$BACKUP_DIR`) |
| `--keep N`  | Delete backups older than N days (default 14, or `$BACKUP_KEEP_DAYS`; `0` disables) |

Two things the script does that a bare `pg_dump` does not:

- it writes to a `.partial` file and only renames it after `pg_dump` exits
  cleanly, so an interrupted run cannot leave a truncated file that looks like
  a good backup;
- it runs `pg_restore --list` over the result and **discards a dump that fails
  verification**, so a corrupt archive is never counted as a backup.

It accepts the `postgresql+asyncpg://` URL the application uses and rewrites the
scheme for `pg_dump`, so you can pass the same `DATABASE_URL` the backend has.

### On a schedule

Nightly at 03:20, keeping a month:

```cron
20 3 * * * cd /opt/mevratek && DATABASE_URL='postgresql://...' \
  ./ops/backup.sh --out /srv/backups --keep 30 >> /var/log/mevratek-backup.log 2>&1
```

Copy `/srv/backups` off the machine. A backup that lives only on the server it
backs up is not a backup — the failure that destroys the database usually
destroys the disk beneath it.

## Restoring

**Stop the backend first.** Alembic's version table comes out of the dump, and
a running application against half-restored schema behaves unpredictably.

```bash
# 1. Stop the API.
docker compose stop backend        # or systemctl stop mevratek-backend

# 2. Restore.
DATABASE_URL=postgresql://user:pass@host:5432/mevratek \
  ops/restore.sh --yes backups/mevratek-20260901-032000.dump

# 3. Bring the schema up to the running code.
cd backend && alembic upgrade head

# 4. Start the API.
docker compose start backend
```

`--yes` is required for any database whose name does not look like a scratch
one (`test`, `scratch`, `restore`, `staging`), so a restore drill can be
scripted while a production restore stays a deliberate act.

The restore replaces the target's contents (`--clean --if-exists`): the result
is the dump's state, not a merge with what was there.

### Step 3 is not optional

The dump carries the schema **as of the moment it was taken**. Restoring a
three-week-old backup onto today's code leaves the database a few migrations
behind, and the application will fail on the first query touching a column that
does not exist yet. `alembic upgrade head` closes that gap.

## Proving it works

An untested backup is a hope, not a plan. Run this drill once, and again after
any change to the database or the deployment:

```bash
# A scratch database, so nothing at stake.
createdb mevratek_restore_test

# No --yes needed: the name marks it as scratch.
DATABASE_URL=postgresql://user:pass@host:5432/mevratek_restore_test \
  ops/restore.sh backups/mevratek-<latest>.dump

# Does the data look right?
psql mevratek_restore_test -c \
  "SELECT (SELECT count(*) FROM organizations) AS orgs,
          (SELECT count(*) FROM users)         AS users,
          (SELECT count(*) FROM robots)        AS devices,
          (SELECT count(*) FROM decisions)     AS decisions;"

dropdb mevratek_restore_test
```

Then answer, out loud: *how much work would we lose if we restored this backup
right now?* The answer is the time since it was taken — that is your real
recovery point, whatever the schedule says.

## What to check monthly

- The newest file in the backup directory is from last night, not last month.
- Its size is in the range you expect. A dump that suddenly shrank is a signal.
- Backups exist somewhere other than the database server.
- The drill above still passes.
- The secrets from section 2 are still where you think they are.

## Upgrading the platform

Take a backup **before** running migrations, not after:

```bash
ops/backup.sh --out /srv/backups        # first
git pull && docker compose build backend
cd backend && alembic upgrade head      # then
```

Some migrations rewrite or drop columns and cannot be undone by re-running the
previous code. The backup is the way back.
