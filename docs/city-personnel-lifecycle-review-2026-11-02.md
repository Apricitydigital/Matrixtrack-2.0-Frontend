# City and personnel lifecycle review — 2 November 2026

The tested local flows pass after the fixes below. This review extends [the earlier municipal workflow review](e2e-review-2026-11-02.md). Production has not been changed or certified by these tests.

## Fixes

- City onboarding now saves the city, administrator and selected module access in one database transaction. City and ULB codes remain optional. Duplicate administrator emails cannot leave an orphan city behind. Validation errors identify the affected fields.
- City enable/disable no longer depends on an external Workforce database operation. This addresses the screenshot where a local status change was followed by a missing external `cities` table error. Unrelated hierarchy synchronization failures are reported separately.
- City Directory supports disable/enable and moving a city to Trash. Deleted cities disappear from active directories; Trash can load and restore them. Existing city sessions and new logins are rejected while the city is disabled or deleted.
- Cities and municipal user directories expose Created and Updated dates, including exports. Profile and assignment edits advance the user's update time. Unknown historical city update times display “Not recorded”.
- Super Admin can edit a specific city role's profile, Zone, Ward and enabled module assignments, including SI/ULB module scopes. Save is followed by a fresh read to verify persisted assignments. Other city roles on the same account are preserved.
- Disabled modules are excluded from assignment choices. Editing enabled modules preserves temporarily disabled assignments so re-enabling the module restores access. Geographic changes also update retained assignment scopes.
- Module permissions are checked against current city provisioning and assignments, including the record-list routes that previously bypassed the shared guard. Removing a module takes effect for existing sessions. Commissioner submission permission remains read-only; fixed role permissions cannot be misleadingly changed in the editor.
- Integrated Employee creation now uses PostgreSQL UUID parameters for the employee record. Registration validates city provisioning and geographic scope before saving users.
- API errors no longer expose raw Prisma/SQL details to users. Missing schema changes return a migration instruction.

## End-to-end evidence

Tests used a disposable PostgreSQL database on loopback port 54329, the real Express routes, Prisma, password login and JWT authentication. No production city or account was modified. Reference geography, bootstrap authentication and plant catalogue configuration were seeded; operational workflow mutations used HTTP endpoints.

| Validation | Result |
| --- | --- |
| Updated API workflow | 19 groups passed |
| Backend regression suite, separate scratch database | 279 passed, zero skipped |
| Frontend/private-backend contract regression | 178 passed, zero skipped |
| Browser city/personnel mutations | 5 groups passed; zero API/runtime errors |
| Browser navigation, filters and mobile layout | 66 checks passed; zero API/runtime errors |
| Frontend and backend TypeScript | Passed |
| Frontend production build | Passed |

The API workflow creates a dummy city and all municipal roles, edits every role's geography and modules, verifies saved dates and scopes, and checks removal/restoration of module access using existing sessions. It verifies city disable/enable, Trash/restore and duplicate onboarding rejection without external Workforce tables.

Operational checks cover Beat registration and SI approval, joint assignment to two Darogas, multi-Beat Ward KML import, Toilet/Bin/GVP CSV imports, Nala registration and approval, and survey submissions. The action flow is **Daroga submission → SI review → ULB Action Required → IEC Action Taken**. Compact dashboard counts are checked after Draft, Submitted, Approved, Action Required and Action Taken transitions. Attendance CSV and plant Excel reuploads verify duplicate replacement rather than double counting. Registers, officer performance and ranking are checked for 1, 7 and 94 days.

The browser creates another dummy city with blank codes and Sweeping-only provisioning, disables/enables it, moves it to Trash and restores it. It edits an SI to Zone 2/Ward 2/Sweeping-only, reopens the editor to verify persistence, then restores the original assignment. A fresh login as the newly created City Admin verifies Sweeping-only operational navigation and module-directory visibility.

The 66-view browser run covers Commissioner, City Admin, ULB and Super Admin, date presets, custom 1 Aug–2 Nov dates, geography filters and the mobile date panel. That broader run and the 279-test backend suite preceded the final disabled-assignment retention and fixed-permission editor refinements; the final API workflow, focused browser mutation run, type checks, contracts and build include those refinements.

Local evidence is stored under `.ui-review/`: `municipal-e2e-results.json`, `lifecycle-browser-results.json`, `lifecycle-flow.log`, `lifecycle-backend-suites.log`, `lifecycle-regression.log`, `lifecycle-all-pages.log` and `lifecycle-frontend-build.log`.

## Deployment and repeatability

Deploy the matching private backend changes with the frontend. Generate Prisma and apply migration **`20261102120000_city_updated_at`** before running the updated backend. It adds `City.updatedAt` without inventing historical update dates. Earlier shared-Beat migration requirements still apply. The backend mirror and hashes are in `backend-patches/superadmin/manifest.json`, section `cityPersonnelLifecycleReview`.

The frontend deliberately reports an outdated-backend error if the atomic onboarding endpoint is missing; it does not retry the old partial-write sequence.

Backend runner: `.publish/backend/tests/municipal-workflow.e2e.cjs`. Set `MUNICIPAL_E2E_DATABASE_URL` to a prepared local `scratch_e2e_` database on port 54329. The runner resets only that explicit scratch database. `MUNICIPAL_E2E_SERVE=1` retains its local test API for browser checks.

Browser runners: `tests/e2e/lifecycle-browser.cjs` and `tests/e2e/municipal-browser.cjs`. This review used `MUNICIPAL_E2E_FRONTEND=http://127.0.0.1:3017/`, local test API 4107 and Chrome debugging port 9336. Frontend contract tests used `MATRIXTRACK_BACKEND_SOURCE_DIR` pointing to the private backend's `src` directory with its installed dependencies.

## Limits

Live S3/AI, connected Workforce/Swachh provisioning, physical mobile camera/GPS and production-volume loading performance remain unverified. Selected connected products save local access and return an explicit external-setup warning; this is not evidence of successful live external provisioning. The tests exercise representative complete flows and filter ranges, not every possible historical record, concurrency pattern or input combination.
