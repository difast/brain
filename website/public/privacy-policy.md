# Privacy Policy — Mevratek MCP Integration

**Last updated:** 15 September 2026
**Controller:** ООО «ИНТЕГРО» (INTEGRO LLC), trading as Mevratek
**Contact:** info@mevratek.ru

This policy covers the Mevratek connector for MCP clients such as Claude and
ChatGPT. It describes only the integration. Use of the Mevratek platform
itself is covered by the privacy notice at https://mevratek.ru/privacy.

---

## 1. What the integration accesses

The connector does not have its own data store. It reads and writes the data
that already belongs to your organization in Mevratek, and only that data.

When you use one of its tools, it can access:

| Data | Tool | Why |
|---|---|---|
| Device identifier, name, type, status, last-seen time | `get_devices`, `get_device_status` | So the assistant can name and pick a device |
| Telemetry: battery, speed, coordinates, reported errors | `get_telemetry`, `get_device_status` | So the assistant can answer questions about device state |
| Decision log: task, model output, confidence, provider, latency | `get_decision_logs` | So the assistant can explain what a device did and why |
| Tasks you create through the assistant | `send_task` | To queue work for a device |
| Simulated devices and scenarios you start | `run_simulator` | To test without physical hardware |

**The connector never accesses:** your password, your payment details, other
organizations' data, your team's account settings, API keys, or camera frames.

## 2. Scope of access

Access is limited to the single organization of the user who approved the
connection. The organization is resolved server-side from your account on
every request — it is not taken from anything the assistant sends. A device
identifier belonging to another organization is reported as not found.

The access token issued to the connector is scoped to the MCP tools listed
above. It cannot be used against the Mevratek dashboard API.

## 3. How data is used

Data is returned to the MCP client you connected — Anthropic's Claude or
OpenAI's ChatGPT — so it can answer your question. What happens to it after
that is governed by **their** privacy policy, not ours:

- Anthropic: https://www.anthropic.com/legal/privacy
- OpenAI: https://openai.com/policies/privacy-policy

Mevratek does not sell data, does not share it with third parties beyond the
MCP client you chose to connect, and does not use it to train any model.

## 4. What Mevratek logs

For each tool call we record the tool name, the organization, the user, and
the time. We do this to operate the service, investigate faults, and detect
abuse. Logs do not contain tool results. They are kept for 90 days.

Authorization events — a connector being approved, a token being issued or
revoked — are recorded in your account's activity log, where you can see
them.

## 5. Where data is stored

The Mevratek platform runs on infrastructure in the Russian Federation.
Customers who deploy Mevratek on premises hold their data entirely within
their own perimeter; in that case this connector talks to their installation,
not to ours.

## 6. How to revoke access

Any of these ends the connection immediately:

1. **In Mevratek:** Account → Sessions. The connector appears as a session
   named after the client, e.g. "MCP: Claude". End that session.
2. **In the MCP client:** remove the Mevratek connector from its settings.
3. **By email:** write to info@mevratek.ru and we will revoke it for you.

Revoking takes effect on the next request — there is no cached grant. Data
already delivered to the MCP client is subject to that client's own retention
and deletion controls.

## 7. Your rights

You may request access to, correction of, or deletion of your personal data,
and you may withdraw consent at any time. Write to info@mevratek.ru. We
respond within 30 days.

Deleting your Mevratek account removes your data from our systems, including
every authorization you granted to any connector.

## 8. Children

Mevratek is a business product and is not directed at children. We do not
knowingly collect data from anyone under 18.

## 9. Changes

We will update the date at the top of this page when this policy changes. If
a change materially affects what the connector accesses, we will ask you to
approve the connection again.

## 10. Contact

ООО «ИНТЕГРО»
Email: info@mevratek.ru
Website: https://mevratek.ru
