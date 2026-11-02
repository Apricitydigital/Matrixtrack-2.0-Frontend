# Ward marks, module assignment and city isolation review

Available marks now total 100 on the individual cards. Workforce retains 30; eligible non-Workforce components share 70. Disabled entity modules and modules with a confirmed zero entity inventory release their share. Missing submissions do not release marks. No activity remains unassessed. Unknown inventory is not treated as an empty inventory.

Example: Nala and GVP disabled, Toilets absent: Workforce 30; Sweeping, Litter Bins, Daroga, SI and IEC 14 each. The underlying earned percentages are preserved when converting older API scores. The same backend calculation serves rankings and official report exports. A cent remainder is distributed deterministically so the displayed maxima sum to exactly 100.

Super Admin provisioning now recovers its city selection when the catalog arrives asynchronously, respects the selected workspace city, understands nested module IDs and verifies the saved state. GVP/CTU aliases resolve to TASKFORCE in personnel assignment. Only city-enabled modules can be assigned.

City directories accept explicit matching city membership and filter foreign module assignments. Changing accounts clears the previous workspace, module context, cached data and city header. A delayed 401 from an old session cannot log out the new session. Backend user responses also filter module memberships by city and role; server edit routes reject foreign-city users.

Validation in an isolated local PostgreSQL database:

- 24 real API workflow groups passed, including GVP disable/enable, City Admin-to-SI assignment and two separate City Admin logins with foreign listing/edit/header spoof attempts.
- 10 focused backend tests passed, covering all 1,024 enabled-module/inventory combinations.
- Four browser checks passed: Super Admin GVP toggle, SI remove/reassign/save/reopen, second-city directory isolation and Workforce 30 with card maxima summing to 100. No browser API or runtime errors.
- Frontend regression suite, TypeScript and production build passed. See local .ui-review results for the recorded runs.

These are local changes and local test results. Production deployment is not part of this review. No production city or user was created or modified. This change requires no new migration; earlier city lifecycle/scoring migrations still apply when deploying that earlier work.
