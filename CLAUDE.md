# Civil Contractor operating instructions

## Who this is for

Business: your civil contracting business. Demo: fictional Kauri Civil.
Operator: the operations manager, with a supervisor responsible for site decisions.
Priorities: competent people, serviceable plant, complete dockets and accurate recorded hours.

Fill in the business and operator before using real records. Read the README and docs/compliance.md. Australian jobs require jurisdiction-specific rules before use.

## Rules

Read before writing. The database is the source of truth. Never invent a person, approval or safety check. Every answer about records starts with the CLI. Ambiguous names list candidates and require a choice. Never send. Drafts stay in drafts/. Deletions, external writes and destructive schema changes require explicit operator approval. Never bypass a dispatch hold with fabricated evidence. A supervisor verifies actual conditions. No payroll calculations or payments.

## Routing

| Ask | Recipe |
|---|---|
| The decisions needed today | `/attention` |
| This week’s crew and plant allocation | `/crew-week` |
| The active civil work sites | `/projects` |
| One site’s record | `/project` |
| The workforce register | `/workers` |
| Plant service dates and next week’s use | `/plant` |
| Competencies expiring in the next sixty days | `/tickets-due` |
| Worker site inductions | `/inductions` |
| Plant prestart results | `/prestarts` |
| Dockets awaiting approval or invoice | `/dockets` |
| Approved work ready for the accounts team | `/invoice-ready` |
| Planned versus recorded hours | `/time-check` |
| Recorded time with unmapped projects visible | `/timesheets` |
| Recent site diary entries | `/diary` |
| Safety record gaps with rule sources | `/compliance` |
| Check an allocation before the supervisor releases it | `/dispatch` |
| Record a worker, plant, competency, induction, allocation, prestart, docket or time entry | `/add` |
| Record a site diary note | `/log` |
| Record a client’s actual approval | `/approve-docket` |
| Record that accounts has invoiced approved work | `/mark-invoiced` |
| Draft a request for the client to review a docket | `/draft-docket` |
| Load Assignar recorded hours | `/import` |
| Export all operational records | `/export` |
| Update an operational record | `/set` |
| Monday operations brief | `/weekly-review` |
| Change fields or rules | `/customise` |
| New read-only report | `/new-view` |

Run recipes through `npm run civil -- ...`. Each read accepts `--json`. Read `.claude/commands/<name>.md` before a recurring job. Use `npm run docs` for paperwork and `npm run view` for dashboards. `npm run civil -- help` lists CLI syntax.

Before adding records, inspect `scripts/lib/domain.mjs`. For `add`, write an input JSON file with only supported fields. Foreign references accept names or ids. Keep source files outside tracked paths. Back up before a migration. Run `npm test` on a temporary database and never seed a real database.

Omni by Enterprise DNA installs and runs the agreed version: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=assignar
