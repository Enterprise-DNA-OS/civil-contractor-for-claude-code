# Load Assignar recorded hours

Run `npm run civil -- import assignar <csv> --batch=<export-name> --dry-run`. Use `--json` for analysis.

Read `docs/replace-assignar.md` first. Only the documented Assignar MYOB AccountRight timesheet export is accepted. Check the preview totals, then repeat without `--dry-run`. Supply `--project` only when every row belongs to that project. Report unmapped hours.

Read before writing. Use the recorded facts, list ambiguous names, and never invent missing information. Summarise the result in the operator’s words.
