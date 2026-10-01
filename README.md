# Civil Contractor for Claude Code

The open-source civil contractor crew, plant and docket system that is just a database and Claude Code. Built by Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Clone, install and run the demo. | Your fields, rules, Assignar export mappings and field interface. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=assignar). | Installed and operated through **Omni by Enterprise DNA**. One setup fee, then a retainer. [See the offer](https://enterprisedna.co/omni/instead-of/assignar?utm_source=github&utm_medium=readme&utm_campaign=assignar). |

## What it does

For the civil contractor coordinating excavators, rollers and operators across infrastructure sites. Eleven record types cover people, plant, sites, assessed competencies, inductions, allocations, prestarts, dockets, recorded time, import batches and the site diary. It does not calculate payroll or process payments.

The morning starts with crew-week and attention. Booking an operator without the recorded competency or induction fails. Overdue plant service also holds the booking. The separate dispatch check requires a passing prestart and leaves the actual work decision with the supervisor. Client approval comes before marking a docket invoiced. One allocation per person and machine per day prevents double booking.

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/civil-contractor-for-claude-code.git
cd civil-contractor-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

Node 20 or newer. No server required. PGlite persists under `.data/db`. The fictional Kauri Civil seed includes a failed roller prestart, expired competency and induction, an overdue service, an unsigned docket and an approved docket waiting for accounts. Demo dates are relative to the first seed run. Re-seeding is idempotent and does not reset records. Use a fresh `DATA_DIR` for a fresh demonstration.

For Postgres, set `DATABASE_URL` via your environment or local `.env`, run `npm run migrate`, and omit demo seeding on real records. The same SQL uses no extensions. See [the operating limits](docs/why-no-front-end.md), including backups and team access.

## Commands

Every command below is an agent recipe in `.claude/commands`. The CLI supports `--json`, case-insensitive names and partial ids. Ambiguous names print candidates and exit with an error. Run `npm run civil -- help` for syntax.

| Command | Job |
|---|---|
| `/attention` | The decisions needed today |
| `/crew-week` | This week’s crew and plant allocation |
| `/projects` | The active civil work sites |
| `/project` | One site’s record |
| `/workers` | The workforce register |
| `/plant` | Plant service dates and next week’s use |
| `/tickets-due` | Competencies expiring in the next sixty days |
| `/inductions` | Worker site inductions |
| `/prestarts` | Plant prestart results |
| `/dockets` | Dockets awaiting approval or invoice |
| `/invoice-ready` | Approved work ready for the accounts team |
| `/time-check` | Planned versus recorded hours |
| `/timesheets` | Recorded time with unmapped projects visible |
| `/diary` | Recent site diary entries |
| `/compliance` | Safety record gaps with rule sources |
| `/dispatch` | Check an allocation before the supervisor releases it |
| `/add` | Record a worker, plant, competency, induction, allocation, prestart, docket or time entry |
| `/log` | Record a site diary note |
| `/approve-docket` | Record a client’s actual approval |
| `/mark-invoiced` | Record that accounts has invoiced approved work |
| `/draft-docket` | Draft a request for the client to review a docket |
| `/import` | Load Assignar recorded hours |
| `/export` | Export all operational records |
| `/set` | Update operational records from evidence. |
| `/weekly-review` | Monday brief from allocations, attention and approved work. |
| `/customise` | Add a field or change a rule with a migration and tests. |
| `/new-view` | Add a read-only HTML report. |

## Documents and views

`npm run docs` writes client dockets and site allocation/safety briefs to `docs-out/`. `npm run view` writes crew, plant and docket dashboards to `views/`. Set company name, logo URL and colours in `brand.json`. Print to PDF from a browser. `draft-docket` writes only to `drafts/`. Nothing sends, invoices or notifies a regulator.

## Compliance records

[docs/compliance.md](docs/compliance.md) ties each check to WorkSafe guidance or an explicitly labelled company policy. NZ guidance informs the default rules. AU licence and state-specific requirements need configuration. A clean record does not authorise unsafe work, and a daily check does not replace checks after attachment changes.

## Ten questions to ask your own records

Each answer is available today. These are useful cross-record questions, not a claim that Assignar cannot produce an equivalent report with its own configuration.

1. Which booked operators have a ticket gap on their work day? (`compliance`)
2. Which allocations have no current site induction? (`compliance`)
3. Which machines are booked after their service due date? (`compliance`)
4. Which plant checks failed today? (`prestarts`)
5. Which dockets have waited more than two days for approval? (`attention`)
6. Which approved dockets have not been marked invoiced? (`invoice-ready`)
7. Where did recorded hours exceed the planned allocation? (`time-check`)
8. Which active sites have gone quiet for more than three days? (`attention`)
9. Which machines have no hours allocated in the next seven days? (`plant`)
10. Which imported hours still need a project assigned? (`timesheets`)

## Your first hour: ten things to ask for

1. Put our business name and logo on the docket.
2. Add our actual sites and client names.
3. Import this Assignar weekly timesheet export as a test.
4. Show the hours that still need a site.
5. Enter the assessed competencies and expiry dates from our records.
6. Enter our machines and manufacturer service dates.
7. Book tomorrow’s operator and excavator after checking the records.
8. Draft a request to approve our oldest unsigned docket.
9. Add a read-only plant availability report.
10. Add our site-specific field and test the migration before applying it.

## Moving from Assignar

Assignar’s [pricing page](https://assignar.com/pricing/) gives a tailored quote, not a public rate, checked 1 October 2026. The base importer accepts its documented MYOB AccountRight timesheet CSV. It retains recorded hours and categories, not payroll calculations. The export does not contain the full civil operations record. [The replacement guide](docs/replace-assignar.md) lists exact columns, repeat-import behaviour and the records needing separate migration work.

```bash
npm run civil -- import assignar examples/assignar-timesheets.csv --batch=example-week --dry-run
npm run civil -- import assignar examples/assignar-timesheets.csv --batch=example-week
npm run civil -- export
```

## Structure

`supabase/migrations` holds the schema and reports. `scripts/civil.mjs` is the only domain CLI. `scripts/lib/db.mjs` selects embedded or shared Postgres. `views.json` and `documents.json` define read-only output. `CLAUDE.md` and `AGENTS.md` route every runtime through the same commands.

## Tests and contribution

`npm test` uses a temporary database, exercises every read and write command, checks imports, failed writes, dispatch holds, generated documents and migration/seed idempotence. CI runs the same suite on Windows and Linux. No real credentials are needed. Keep migrations portable, drafts local and claims grounded in the implemented commands.

MIT. Copyright 2026 Enterprise DNA.
