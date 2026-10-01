# Bring recorded hours out of Assignar

The supported input is Assignar’s documented **MYOB AccountRight timesheet CSV export**. It provides published column names. This tool stores recorded hours and original categories, and does not calculate payroll, apply award rules or send anything to MYOB.

Source checked 1 October 2026: [Assignar export to MYOB AccountRight](https://support.assignar.com/hc/en-au/articles/8421940869135-Export-Timesheets-to-MYOB-AccountRight). For other options see [Export Timesheets to CSV](https://support.assignar.com/hc/en-au/articles/8086448006287-Export-Timesheets-to-CSV) and [Expanded Timesheet List View](https://support.assignar.com/hc/en-au/articles/12717352894095-Expanded-Timesheet-List-View).

1. In Assignar, review and approve the desired timesheets. Open Timesheets, Weekly. Select the week and the MYOB export option. The vendor describes running its overtime rules before export. Keep those decisions in the existing payroll process.
2. Preserve the original CSV. Use a non-overlapping period and include every required employee row. The sample in `examples/assignar-timesheets.csv` is fictional, using the documented headings.
3. Preview: `npm run civil -- import assignar exports-from-assignar.csv --batch=week-2026-09-21 --dry-run`.
4. Import with the same command without `--dry-run`. This is the one-command import. `--project="River Road Drainage"` assigns the entire file only when every row belongs to that site. Otherwise the records remain visibly unassigned.
5. Compare employee totals and dates with Assignar, then run `timesheets`, `time-check` and `attention`. Keep Assignar available until the mapping and working process are confirmed.

| Assignar column | Destination |
|---|---|
| Emp. Co/Last Name + Emp. First Name | Worker display name |
| Employee. Card ID | Stable worker external id |
| Date | Work date, YYYY-MM-DD or DD/MM/YYYY |
| Units | Recorded hours, positive decimal up to 24 per worker/day |
| Payroll Category | Original category text only |
| Job | Not mapped. Assignar documents it as n/a in this export. |

Several activity rows are preserved. Employee id is mandatory, so same-name workers stay separate. Importing the exact same batch again is a no-op. A changed file or changed project with the same batch name is rejected. A new batch overlapping an employee/day already recorded outside that batch is also rejected. Corrected exports need deliberate reconciliation against the original batch, not another import name. Dry runs and any malformed row roll back the entire transaction, including newly encountered workers.

This export does not carry plant, allocations, competencies, inductions, prestart forms, dockets, attachments, photos, approval signatures or site diaries. Generic and Expanded exports have different or custom columns, so they are not accepted by this importer. Enterprise DNA maps those additional exports and verifies the counts as part of a customised migration. The free version includes `add` for the operational records, and `export` writes every entity with ids and relationships to JSON. That snapshot is portable data, not an automated restore tool. Back up the embedded data directory while closed, or use your managed database’s backup and restore tools.
