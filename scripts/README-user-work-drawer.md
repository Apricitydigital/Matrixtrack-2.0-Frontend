# Registered user work drawer

Run `node scripts/test-user-work-drawer.cjs` to render the actual drawer with synthetic data. No database or login is required.

The drawer displays assignments and all-time report counts. Completed is distinct from Approved; Needs attention includes rejected and action-required work. It supports the backend's `roles` array and falls back when older responses omit `completed` or `roles`.

Inline assignment mutations were removed during review: the existing user PATCH collapses city roles, and a beat-level unassign can clear assignments beyond the selected user. Use the existing assignment management screens instead. Existing registered-user edit, delete and password reset flows are unchanged.

Staging smoke test: open a user's name, confirm scope/assets and five status totals; test loading/error states, Escape, Tab focus, backdrop close and narrow screens. Backend work-summary endpoint must be deployed before using this view.
