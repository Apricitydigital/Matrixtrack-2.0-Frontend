# Ward Ranking and report review — 2 November 2026

## Findings and changes

**Beat visits and captured points were being presented as comparable counts.** In the supplied example, 32 is the total planned beat visits, not the remaining visits. Five visits were submitted, leaving 27 awaiting submission. Sixteen is the number of captured points across those visits, against 160 planned point captures. A submitted visit may contain three of five configured points, so submission and complete point coverage are separate measures.

The evidence labels now read Registered beats, Planned beat visits, Submitted beat visits, Visits awaiting submission, Planned point captures, Point captures saved, Draft visits started and Visits with all points. Hover/click information explains each denominator. Images and secondary counters are retained under More evidence instead of repeating the primary counts. Draft visits are already part of the awaiting-submission count; they are not additional work.

For multiple days, planned beat visits = current registered beats × inclusive selected days. Planned point captures = the sum of configured points × days. Submitted visits count each beat once per IST operational day, excluding Draft. Captured points include Draft progress. These are operational activity counts, distinct from unique entities reached across the entire selection.

**Reports & Exports previously used a different ranking formula.** Its highest list combined target achievement and reviewed cleanliness; its attention list used an inverted shortfall measure. Thus “100” could describe a large gap rather than a good ward score. Zone reports now call the same full-city Ward Ranking calculation for the same dates. Both report lists show the same official score, with higher scores first in the highest list and lower scores first in the lowest list. Unassessed wards are excluded and a ward cannot occur in both lists. A single assessed ward still appears in the highest list. Completed/cleaned/not-cleaned counts in the Commissioner report are reconciled against the selected inspection register while preserving the official score.

**Workforce now carries 30 marks in the revised default policy.** To retain 100 total marks:

| Component | Marks |
| --- | ---: |
| Workforce | 30 |
| Cleanliness of Toilet | 14 |
| Sweeping | 8 |
| Nala | 8 |
| Litter Bins | 8 |
| CTU/GVP Transformation | 8 |
| Daroga | 8 |
| Sanitary Inspector | 8 |
| IEC Member | 8 |

Each component's internal proportions are preserved and scaled to its main weight. The final ward score is earned applicable marks ÷ applicable maximum × 100. Workforce and IEC retain their responsibility weight without awarding marks for missing activity. Other components without an applicable operational denominator are excluded. The backend now applies the fixed responsibility rule itself, keeping report and frontend calculations aligned. No rank is assigned without operational data.

Nala and GVP now remain visible in the component grid, with Not applicable where appropriate. All nine component cards are compact; the detailed score calculation and secondary evidence are expandable. Zone/Ward choices use natural alphabetical/numeric ordering (Ward 1, Ward 2, Ward 10); performance-band options are alphabetical. Sorting the dropdown does not alter official city ranks.

**IST midnight grouping was inconsistent.** Sweeping, Nala, Toilet and Bin deduplication used the UTC date of the report timestamp; GVP already used the operational date. These now all use IST operational days. An integration test adds a second record at 00:30 IST for the same beat/day and verifies that it adds no duplicate ranking credit.

The wider regression suite also exposed a separate concurrent inspection retry race. A second request could discover the first request's saved photo after its initial replay lookup and incorrectly return “photo already submitted”. State, attempt and evidence prechecks now recheck for the same saved attempt, returning it without another inspection or evidence insertion. Reused evidence for a different attempt remains rejected.

## Verification

- Frontend/private-backend contract regressions: **180 passed**, zero skipped.
- Final complete backend regression suite: **283 passed**, zero skipped.
- Revised-weight, sub-factor totals, fixed responsibilities, Beat scoring and shared report-score tests: **4 passed** (also included in the full backend suite).
- Real API/database workflow: **20 groups passed**, including report/ranking score equality for 1, 7 and 94 days and IST-midnight deduplication.
- Browser: **6 ranking/report checks passed**, zero API or runtime errors. Today, 7-day and 90-day selections show all nine factors, Workforce /30, distinct point/visit evidence, naturally ordered ward choices and exported scores equal to Ward Ranking. Desktop and mobile layouts were inspected.
- Migration execution against disposable PostgreSQL passed. A saved legacy default configuration advanced to Workforce 30/Toilets 14 and a new version; a custom 20-mark Workforce policy remained unchanged.
- Both TypeScript checks and the final frontend production build passed.

The initial broad backend repeat passed 282 of 283 tests and exposed the concurrent retry issue above. After its fix the entire 35-test Daroga inspection suite passed, followed by all **283 tests** in the final complete backend repeat.

Evidence: `.ui-review/ranking-contracts.log`, `ranking-unit.log`, `ranking-e2e.log`, `ranking-browser-results.json`, `ranking-migration-check.log`, `ranking-concurrency-regression.log`, `ranking-backend-final.log`, `ranking-build.log`, `ranking-desktop.png` and `ranking-mobile.png`.

## Deployment

Deploy the matching frontend and private backend, regenerate Prisma, and apply **`20261102160000_ward_ranking_weights`**. The migration updates existing active configurations that match the old default weights and preserves custom weight policies. Historical snapshots remain unchanged. Trend loading filters by the effective configuration version so old default weights are not compared with revised scores. Cities without a stored configuration use logical default version 2.

The backend patch mirror and SHA-256 hashes are in `backend-patches/superadmin/manifest.json`, section `wardRankingReview`. Earlier migration requirements remain applicable. No production data, deployment or Git push was performed in this review. Tests used isolated local databases; production loading performance, external integrations and every possible historical data shape are not certified by these results.
