# Record a worker, plant, competency, induction, allocation, prestart, docket or time entry

Run `npm run civil -- add <entity> --data=<json-file>`. Use `--json` for analysis.

Read `scripts/lib/domain.mjs` for allowed fields. Write only the operator’s facts into a temporary JSON file. References accept a name or id. Approval and invoice dates use their dedicated commands.

Read before writing. Use the recorded facts, list ambiguous names, and never invent missing information. Summarise the result in the operator’s words.
