# Registered user work drawer

Run `node scripts/test-user-work-drawer.cjs` to render the actual drawer with synthetic data. No database or login is required.

The drawer displays assignments and all-time report counts. Completed is distinct from Approved; Needs attention includes rejected and action-required work. It supports the backend's `roles` array and falls back when older responses omit `completed` or `roles`.

Assign buttons use the dedicated additive `/city/users/:id/assignments` API. The city-wide catalog shows asset geography and current assignees. Scope/module expansion and beat reassignment require an explicit confirmation showing the effects. Names are not editable; a single role is displayed as text, and multi-role users can choose which existing role receives the assignment. The backend validates city, role, active module and geographic scope. Buttons require `canManageAssignments` from the backend response, so deploy the backend update first. Legacy destructive quick-remove controls remain absent.

Run `node scripts/test-user-assignment-picker.cjs` for picker loading, search, role selection, save, error and duplicate-submit behavior.

Staging smoke test: open a user's name, confirm scope/assets and five status totals; test loading/error states, Escape, Tab focus, backdrop close and narrow screens. Backend work-summary endpoint must be deployed before using this view.
