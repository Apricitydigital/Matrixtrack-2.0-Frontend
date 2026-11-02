# Shared Darogas for all Ward Beats

The City Admin action **Staff Assignments → Assign Ward Darogas** assigns every selected Daroga jointly to every current approved Beat in the chosen Ward. It does not divide Beats between Darogas and is independent of table filters/pagination.

Add preserves existing whole-Beat and sub-beat Darogas. Replace sets the chosen shared team on every Beat and replaces legacy Daroga assignments, preserving employee IDs. Eligibility requires an existing Sweeping Supervisor role in the authenticated city and the selected Ward/Zone; the action never grants a new role or extends geography.

The preview contains a revision of the Ward's current Beats/assignments. Saving checks it again inside a serializable transaction. A changed Ward rejects with 409; an eligibility or audit failure rolls back all assignments. Newly imported Beats are included only after the action is applied again.

## Backend source and deployment

The complete implementation is in the local backend checkout `.publish/backend`; the changed source files are also staged under the ignored `backend-patches/superadmin` directory. Its manifest lists the feature files and SHA-256 checksums. These private backend sources must be shipped with the backend, not bundled into the public frontend.

1. Review the additive Prisma migration `prisma/migrations/20261102000000_shared_beat_supervisors/migration.sql`. It adds the non-null UUID array `CityAreaBeat.sharedSupervisorIds`, defaulting to empty, plus its GIN index. Existing assignments are preserved.
2. Apply the reviewed migration through the backend's normal database release process **before** starting the new backend. No migration has been applied by this task.
3. Generate the Prisma client and build/deploy the updated backend to the API host used by this frontend.
4. Deploy the updated frontend. An older API returns a clear “updated backend required” message for this new action; it does not silently fall back to repeated individual assignments.

The authenticated City Admin endpoints are GET/POST `/city/areas/ward-assignments`. POST accepts `zoneId`, `wardId`, `supervisorIds`, `mode: add | replace`, and `expectedRevision`.

## Related behavior

- Shared Darogas receive the Beats and all inspection points in mobile `my-beats`, and can submit Sweeping inspections. Shared responsibility does not grant employee access or allow cross-city assignment.
- Beat responses, maps, work summaries, QC owner lists, performance assignment inventory, assignment counts and Ward supervisor discovery include the shared team. Registered Beat totals still count physical Beats once.
- Existing per-person report-author/timing/target credit rules remain authoritative; a shared assignment alone does not fabricate inspection credit for every team member.
- Existing individual whole-Beat assignment intentionally clears the shared team for that Beat, with an explanation in the UI. Sub-beat assignment preserves the shared whole-Beat team.
- Automatic supervisor assignment skips Beats with shared teams.
- No database migrations, real account writes, or production deployment were run during validation.

## Validation

Backend tests `tests/ward-beat-assignments.test.cjs` cover shared Add/Replace, retained employee assignments, eligible geography, stale revisions and rollback on audit failure with an in-memory transaction fixture. Frontend tests cover one shared request for all Ward Beats, eligibility and role checks, older-API handling and shared-name mapping. Browser fixtures exercise multi-selection, 21 Beats across multiple preview pages despite an active search, one save request, refreshed names, conflict/reload, and mobile fit. Browser writes are fixture-only.
