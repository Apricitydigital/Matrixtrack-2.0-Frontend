# Equal ward marks, action totals and report evidence — 2 November 2026

This review supersedes the weight allocation in the earlier Ward Ranking review. Changes were implemented and verified locally; production has not been deployed or modified.

## Common scoring policy

Workforce retains **30 marks**. Sweeping, Nala, Toilets, Litter Bins, CTU/GVP, Daroga, SI and IEC share **70 marks equally**: **8.75 each** when all eight apply.

Only an explicitly empty registered service inventory releases that service's marks. Existing entities with no inspections retain their marks and earn zero for missing work. Missing/unknown inventory is not treated as zero. The Daroga, SI and IEC responsibility cards retain their shares even when no activity has been recorded. Workforce never receives redistributed marks.

| Ward inventory | Workforce | Other available component maxima |
| --- | ---: | --- |
| All five services registered | 30 | Eight × 8.75 |
| No litter bins; other services registered | 30 | Seven × 10 |
| Three services absent | 30 | Five × 14 |
| All five services absent | 30 | Daroga 23.34, SI 23.33, IEC 23.33 |

Allocation uses cents with a deterministic rounding remainder so maxima always total **100.00**, rather than displaying rounded values that add to 100.02. Existing component performance percentages and internal sub-factor proportions are preserved; the available component maximum changes. The final score is the sum of earned marks out of 100. No activity still means no rank; inventory alone does not create an assessed ward.

The backend applies this once, before city/zone ranks, summaries, reports and snapshots. It marks responses with `WORKFORCE_30_EQUAL_70`; the frontend preserves the authoritative redistributed maxima instead of resetting IEC to its base weight. Cards show their effective maximum and redistributed share. The same calculation therefore reaches Ward Ranking, connected dashboards and Zone reports.

## Actions required and taken

The City Overview now always displays a separate Action follow-up section:

- **Total actions required**: distinct selected inspection reports that required action at any stage, including those now at Action Taken.
- **Actions taken**: selected required-action reports currently at Action Taken.
- **Outstanding actions**: required reports not currently at Action Taken.

Moving a report from Action Required to Action Taken retains Total actions required and reduces only Outstanding actions. These lifecycle totals overlap the mutually exclusive current-status cards; they are not added to Total inspection records. Dates select the inspection-report submission cohort, not the dates on which each action transition occurred. Each report counts once, rather than counting repeated action cycles as separate reports. A reopened action becomes outstanding again.

Each card carries the selected geography and dates into a matching report filter. Unit tests verify count reconciliation and unchanged achieved inspections across the transition. A browser workflow ended with **2 required, 2 taken, 0 outstanding** after two actual reports completed the action flow.

## Pending reports, images and refresh

The Commissioner register uses a complete date-scoped report list, while the shared store may contain only an initial page. Opening a report now saves the exact selected record to the store before opening the drawer. It no longer assumes that selected records already exist in the smaller shared list. Opening the drawer loads only missing personnel contacts, rather than loading an unrelated performance page that could replace report data with its first page.

Image mapping combines top-level and payload evidence even when the top-level photo array is empty. It supports storage URLs, image URIs, nested Beat-point answer photos and PHOTO survey answers. Photos and saved AI results are not hidden because a report is Pending review.

The drawer refreshes on opening, returning focus to the window and pressing Refresh report. It reads the selected module's report-day register under the existing city/role authorization, identifies the exact report, and refreshes its status, photos, decisions, timeline and AI. It invalidates dated dashboard reads so connected counts reload too. Refresh errors retain the last loaded report with an explicit message. This is not a continuous WebSocket/polling update mechanism.

## AI roles

Recorded SI and ULB suggestions appear in the report overview as well as the AI tab. The Commissioner sees them as read-only oversight and receives no ULB generation button. SI views exclude downstream ULB recommendations. ULB generation retains its existing role check and completed-SI-review prerequisite.

Shared model instructions now distinguish:

- Daroga: evidence completeness and retake assistance; no review, assignment or closure authority.
- SI: compare answers with visible evidence and flag uncertainty; no ULB escalation or task closure.
- ULB: operational follow-up after the recorded SI decision; preserve that decision and never claim to assign staff or mark Action Taken.

All stages treat instructions inside report content as untrusted, require uncertainty/missing-evidence statements and remain advisory. The IEC submits corrective evidence; the Commissioner oversees the recorded workflow. Local browser tests used a saved synthetic SI suggestion and a local test image. They verify visibility and role controls, not live model generation quality or production AI configuration.

## Verification

- **183** frontend/private-backend contract tests passed, zero skipped.
- **9** focused backend tests passed, including all **32 service-inventory combinations**, unknown inventory, existing-but-uninspected bins, exact Workforce contribution and role-specific AI instructions.
- **21** real API/database workflow groups passed. Ranking/report scores match across 1, 7 and 94 days under the new policy; IST-day deduplication remains verified.
- **6** browser checks passed with zero API/runtime errors. They verified cumulative action drilldowns, pending evidence decoding, saved SI AI visibility, actual SI → ULB → IEC updates in the Commissioner drawer, refreshed dashboard totals and absent-inventory redistribution.
- Migration execution passed against disposable PostgreSQL, including upgrading saved configurations and advancing their versions.
- Prisma generation, backend/frontend TypeScript checks and production build passed.

Evidence logs are under `.ui-review/action-equal-*`; migration evidence is `equal-marks-migration-check.log`. Browser evidence is `action-equal-browser-results.json`, `pending-report-photos.png` and `action-equal-browser.png`. The final minor drawer-loading change removes an unrelated performance fetch; it was included in the final build after the browser workflow.

## Deployment

Deploy the matching frontend and backend, regenerate Prisma and apply **`20261102170000_equal_ward_component_marks`**, after earlier pending migrations. This applies the common 30/70 main-weight policy to saved active configurations, including previously customized main weights; configured internal ratios and thresholds remain available. Attempts to save different main weights are rejected clearly. Cities without a saved configuration use logical default version 3. Historical snapshots are retained and trend loading uses the effective configuration version.

Backend sources and SHA-256 hashes are mirrored under `backend-patches/superadmin/manifest.json`, section `equalWardMarksAndReportActions`. No Git push or production deployment was performed. Tests used isolated local data and did not call live external AI/storage services.
