# Why this version has no front end

A civil operations manager needs to know who is booked, whether plant can work and which dockets need chasing. Those records live in a database. The commands query them and write read-only HTML summaries and paperwork. Your coding agent is the door to those records.

This is an office-operated base for crew and plant coordination. It does not include a mobile field app, offline capture and sync, drag-and-drop scheduling, GPS, photos or signature capture. It cannot replace those workflows by itself. Enterprise DNA can build the agreed field interface and integrations as part of your version. Keep the existing field workflow until that work is delivered and tested.

One worker and one item of plant can have one allocation per day in the base version. That intentionally rejects double bookings but also excludes legitimate split shifts. Add shift intervals and overlap tests through `/customise` before running split-shift operations.

Local PGlite supports one process at a time. For shared operations use managed Postgres, distinct database roles, tested backups and a secure connection. The CLI uses the database credentials supplied to it and has no separate per-user access control or tamper-proof audit history. Set those requirements before connecting a team. Agent subscriptions, hosting and support have their own costs.

Built and run for you through Omni by Enterprise DNA: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=assignar
