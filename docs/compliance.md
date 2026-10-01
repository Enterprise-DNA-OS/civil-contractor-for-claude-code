# Civil works record checks

Checked 1 October 2026. The default demo is a New Zealand civil contractor. These are evidence checks, not a certificate of legal compliance or authorisation to work. Site supervisors assess real conditions. Australian projects require their state’s rules and licence classes to be configured before relying on the checks.

| Rule | Implemented check | Basis |
|---|---|---|
| competency | An allocated operator needs an assessed, unexpired competency for the plant’s required ticket on the work date. | WorkSafe NZ, [training and competency, sections 28.2 and 28.3](https://www.worksafe.govt.nz/topic-and-industry/road-and-roadside/keeping-healthy-safe-working-road-or-roadside/part-d/28-0-training-certifications-and-competency/). A licence alone does not establish competence. The company sets reassessment dates. |
| induction | An allocation needs a current worker/site induction. | Site policy supporting WorkSafe NZ [excavation safety](https://www.worksafe.govt.nz/topic-and-industry/excavation/excavation-safety-gpg/), including worker information and training. Expiry periods are company policy, not a universal statutory period. |
| prestart | Plant needs a passing check on the work date. Missing or failed checks block the dispatch check. Future bookings show a prestart reminder. | WorkSafe NZ [using quick hitches safely](https://www.worksafe.govt.nz/topic-and-industry/vehicles-and-mobile-plant/using-quick-hitches/): check before work and whenever an attachment changes. This daily record alone does not prove the attachment-change check happened. Record those details in notes and follow the manufacturer’s procedure. |
| service | Plant cannot be allocated beyond its recorded service date. | Company maintenance policy informed by WorkSafe NZ [excavation safety](https://www.worksafe.govt.nz/topic-and-industry/excavation/excavation-safety-gpg/). Dates come from the manufacturer and business maintenance schedule, not an invented legal interval. |
| active | Inactive workers, inactive plant and closed projects cannot accept new allocations. | Company operating policy. |

`npm run civil -- compliance` includes historical findings, so missing evidence remains visible. `attention` shows recent allocation findings and commercial follow-ups. New allocations enforce competency, induction, maintenance and active-record checks. Prestarts are verified by `dispatch`, which still leaves the site decision with a supervisor.

This version does not manage SWMS, excavation permits, utility locates, traffic plans, incident notifications, high-risk work licensing validation or regulator submissions. Record checks cannot replace those obligations. No payroll calculations, payments or legal documents are issued.
