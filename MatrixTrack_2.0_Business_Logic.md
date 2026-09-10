# MatrixTrack 2.0 — Business Logic Specification

**Version:** Consolidated project logic as of 8 September 2026  
**Purpose:** Give developers, AI assistants, testers, designers, and product teams a single source of business-flow context for MatrixTrack 2.0.

---

## 1. Core Business Objective

MatrixTrack 2.0 is a municipal cleanliness operations and governance platform.

The system connects:

**Workforce Attendance → Work Assignment → Field Execution → Digital Evidence → Inspection → Quality Control → ULB Review → Corrective Action → Resolution → Performance Measurement → Ward Ranking → Executive Decision-Making**

The product should always answer five questions:

1. Was the required workforce available?
2. Was the assigned work actually performed?
3. Was acceptable evidence submitted?
4. Was the work verified for quality?
5. If a problem existed, was it resolved and reflected in performance?

---

# 2. Primary Entity Hierarchy

The system hierarchy is:

```text
City
└── Zone
    └── Ward
        ├── Area
        ├── Beat
        ├── Toilet
        ├── Litter Bin
        └── Personnel Assignment
            ├── Supervisor
            └── Employee
```

Business rules:

- Every operational record must remain scoped to the correct city.
- Zone and Ward relationships must remain consistent.
- A user must only see data allowed by their role and geographic/module scope.
- An assignment must not silently move between wards/zones without an explicit update.
- Deleted or inactive masters must not remain selectable for new assignments unless recovery/restoration rules permit it.

---

# 3. Roles

Core roles:

```text
HMS_SUPER_ADMIN
CITY_ADMIN
COMMISSIONER
ULB_OFFICER
QC
ACTION_OFFICER
SUPERVISOR
EMPLOYEE
```

## 3.1 HMS Super Admin

Can operate across platform-level administration according to granted scope.

Expected logic:

- Manage/inspect multi-city configuration.
- Manage top-level users/modules.
- Must not be accidentally restricted by a city-only frontend assumption.
- Must not bypass audit logging for administrative actions.

## 3.2 City Admin

City-scoped administrative role.

Typical permissions:

- Manage city masters.
- Manage users.
- Manage zones.
- Manage wards.
- Manage areas.
- Manage beats.
- Manage module-related assets.
- Manage relevant assignments.
- View city-level operational information according to access policy.

## 3.3 Commissioner

Executive/leadership role.

Expected logic:

- Primarily consumes aggregated operational intelligence.
- Should be able to drill down into source records.
- Should not be forced into field-level transactional workflows.
- Should receive city/zone/ward exception information.

## 3.4 ULB Officer

Operational management/decision role.

Important rule:

**ULB Officer is the role that can escalate a QC-processed issue into Action Required.**

ULB Officer should be able to review:

- Approved inspections.
- Rejected inspections.
- QC remarks.
- Evidence.
- AI action suggestions where supported.
- Corrective-action history.

## 3.5 QC

Quality Controller.

Critical rule:

**QC can Approve or Reject. QC does not own the final Action Required decision.**

QC responsibilities:

- Review submitted work/evidence.
- Approve if acceptable.
- Reject if quality/requirements fail.
- Add QC remark when required.
- Preserve review history.

## 3.6 Action Officer

Receives items formally escalated as Action Required.

Responsibilities:

- Review assigned corrective issue.
- Perform corrective action.
- Add action details/remarks/evidence where applicable.
- Complete the issue as Action Taken / resolved according to workflow.

## 3.7 Supervisor

Field operational role.

Responsibilities vary by module but commonly include:

- View assigned operational assets/beats.
- Conduct or submit inspections.
- Capture field evidence.
- Provide remarks/voice-to-text inputs where supported.
- Track own Pending/Approved/Rejected work.
- Cannot perform QC approval on own submitted inspection.

## 3.8 Employee

Field workforce role.

Employee data contributes strongly to:

- Attendance.
- Beat/workforce deployment.
- Assignment context.
- Performance analysis where product rules support it.

---

# 4. Core Inspection State Machine

The fundamental inspection flow is:

```text
ASSIGNED / EXPECTED
      ↓
FIELD SUBMISSION
      ↓
QC PENDING
   ↙      ↘
APPROVED  REJECTED
     \      /
      \    /
       ULB REVIEW
          ↓
  ACTION REQUIRED? ── No ──> Remains QC outcome
          │
         Yes
          ↓
   ACTION REQUIRED
          ↓
   ACTION OFFICER
          ↓
    ACTION TAKEN
```

Important principles:

- QC decision and ULB corrective-action decision are separate.
- Rejected does not automatically mean Action Required unless product logic explicitly does so.
- Approved does not prevent ULB from escalating if management identifies a material issue.
- Action Required should be traceable to the ULB/user who escalated it.
- Action Taken should be traceable to the Action Officer/user who closed it.

---

# 5. Inspection Record Requirements

A valid inspection record should preserve the relevant combination of:

- Module.
- City.
- Zone.
- Ward.
- Asset/Beat identifier.
- Assigned Supervisor.
- Date/time.
- Inspection status.
- Evidence/images.
- Field remark.
- QC status.
- QC remark.
- QC reviewer.
- QC timestamp.
- ULB action decision.
- Action Required timestamp.
- Action Officer.
- Action Taken detail.
- Resolution timestamp.
- AI suggestion metadata where applicable.
- Audit references where supported.

Do not overwrite historical state in a way that destroys accountability.

---

# 6. Sweeping Business Logic

Sweeping operates around **beats**.

A beat belongs to the appropriate geographic hierarchy and is assigned to field personnel according to configuration.

## 6.1 Daily Logic

Sweeping evidence is date-sensitive.

Business expectation:

- Current-day status must not be derived from previous-day evidence.
- Historical evidence should remain available.
- A user should not accidentally submit duplicate evidence for the same logical beat-point/date if the system rule prohibits duplicates.

## 6.2 Beat Evidence Points

Established project context:

**Each sweeping beat uses 5 inspection/evidence points.**

General rule:

- Evidence should be associated with a specific beat point.
- The same point should follow the current one-submission-per-day logic implemented in code.
- Completion must be calculated from the current day's valid evidence, not stale images.

Previously used progress semantics included:

```text
0 evidence → Yellow
partial / up to 3 → Amber
higher completion → Green
```

Exact UI thresholds must follow current code if they have changed.

## 6.3 Sweeping Validation

Before accepting a sweeping submission, verify as applicable:

- User has access to the beat.
- Beat is active.
- Beat belongs to correct ward/city.
- Date rule is valid.
- Required point/evidence is present.
- Image/evidence upload succeeded.
- No prohibited duplicate submission exists.
- AI image validation result is handled correctly if enabled.

---

# 7. Toilet Business Logic

A Toilet is a registered municipal cleanliness asset.

Supervisor flow:

```text
Assigned Toilet
   ↓
Inspection
   ↓
Evidence + Remark
   ↓
Submit
   ↓
QC
   ↓
ULB / Action flow
```

Business expectations:

- Toilet must exist and be active.
- User must have assignment/module access.
- Current map status should reflect current inspection state.
- Completed and Pending assets should not be mixed due to stale cache/data.

Common visual semantics:

```text
Completed → Green
Pending   → Red
```

Performance analysis may include:

- Total expected inspections.
- Submitted.
- Not submitted.
- QC pending.
- Approved.
- Rejected.
- Complaint/non-complaint grouping where data exists.
- First-time approval.
- Repeated/reviewed inspection patterns.

---

# 8. Litter Bin / Twin Bin Business Logic

A Litter Bin is a registered cleanliness asset.

Flow is similar to Toilet:

```text
Assigned Bin
   ↓
Inspection
   ↓
Evidence
   ↓
Submission
   ↓
QC / Auto-QC where configured
   ↓
ULB review
   ↓
Action if required
```

Expected map semantics:

```text
Completed → Green
Pending   → Red
```

The map may show a current-location to pending-asset route/indicator.

Do not calculate completion only from frontend state; use persisted inspection data.

---

# 9. AI Image Validation Logic

Purpose:

Prevent irrelevant or incorrect photos from being used as valid cleanliness evidence.

Applicable modules include:

- Sweeping.
- Toilet.
- Litter Bin.

Expected logical pattern:

```text
Image captured/uploaded
      ↓
Basic technical validation
      ↓
AI image validation (if enabled)
      ↓
Valid?
  ↙       ↘
Yes        No
 ↓          ↓
Continue    Explain failure / request correct evidence
```

Rules:

- AI failure must not silently be treated as success unless a deliberate fallback rule exists.
- Network/AI-service failure should be distinguished from "image is invalid".
- Legitimate field users should receive understandable retry guidance.
- Do not let AI mutate official QC status.
- AI validation is evidence assistance, not an official municipal quality decision.

---

# 10. QC Business Logic

## 10.1 Eligible Records

QC should see records that:

- belong to QC's allowed scope,
- require review,
- have valid submitted evidence,
- are not already finalized in a conflicting state.

## 10.2 QC Decision

Allowed decisions:

```text
APPROVED
REJECTED
```

QC must not create `ACTION_REQUIRED` directly in the intended workflow.

## 10.3 QC Remark

QC remark should remain attached to the inspection and be visible to downstream ULB/AO users where appropriate.

## 10.4 Review Integrity

Prevent:

- duplicate review race conditions,
- unauthorized QC access,
- self-review where prohibited,
- hidden replacement of prior QC reviewer,
- status transitions from impossible states.

---

# 11. ULB Review Business Logic

ULB reviews QC-processed records.

ULB should be able to understand:

- module,
- asset/beat,
- evidence,
- supervisor,
- QC outcome,
- QC remark,
- historical context,
- AI action suggestion where supported.

ULB decision:

```text
Does this record need corrective intervention?
```

If no:

- Record remains under normal QC outcome.

If yes:

```text
QC Outcome
   ↓
ULB marks Action Required
   ↓
Action workflow starts
```

`Action Required` should store who/when/why where the schema supports it.

---

# 12. Action Officer Business Logic

Eligible records:

- Must already be `ACTION_REQUIRED`.
- Must be within AO scope or assignment.
- Must not be already finally resolved unless reopening is a supported workflow.

AO flow:

```text
View issue
  ↓
Understand evidence + QC + ULB context
  ↓
Perform corrective work
  ↓
Record action
  ↓
Mark Action Taken
```

Metrics should distinguish:

- Action Required count.
- Action Pending count.
- Action Taken count.
- Timeliness/on-time completion where backend logic defines it.

A previously discussed two-day fallback for on-time completion must not be assumed without checking current backend scoring logic.

---

# 13. AI Action Suggestion Logic

AI can assist ULB in deciding what corrective action may be appropriate.

Example supported context:

- Sweeping AI action endpoint has existed.
- AI may use inspection context and QC remarks.

Expected flow:

```text
Inspection + QC data
       ↓
AI suggestion generation
       ↓
Suggested corrective action
       ↓
Human ULB review
       ↓
Accept / modify / ignore
```

Critical rule:

**AI suggestion does not itself change the official inspection/action status.**

Human/system business flow remains authoritative.

---

# 14. Attendance Business Logic

Attendance is a management signal for workforce availability.

The system should answer:

- Who was expected?
- Who attended?
- Was attendance uploaded?
- Was punch-out completed?
- Was GPS captured?
- Which zone/ward is underperforming?
- Are repeated absences occurring?

## 14.1 Attendance Calendar

Expected visual status:

```text
Green → Attendance exists/uploaded
Red   → Missing/not uploaded
White → Future
```

The status must use the actual selected date and must not mark future dates as missed.

## 14.2 Attendance Aggregation

Attendance KPIs may include:

- Total workforce.
- Present.
- Absent.
- Attendance compliance.
- Punch-out compliance.
- GPS capture rate.
- Today's turnout.
- 7-day average.
- Zone-wise turnout.
- Ward-wise turnout.
- Employee/designation performance.

Exact KPI denominator rules must be defined by backend/data logic.

## 14.3 Executive Attendance Logic

Commissioner-style comparison:

```text
Today's workers on ground
vs
7-day average
```

Useful exceptions:

- zone below normal turnout,
- ward below normal turnout,
- no attendance for repeated days,
- poor punch-out compliance,
- low GPS capture.

The dashboard should emphasize exceptions, not only totals.

---

# 15. Inspection & Performance Business Logic

This module aggregates operational inspection outcomes.

Common filters:

- Date range.
- Module.
- Zone.
- Ward.
- Supervisor.
- Status.
- Search.

Primary module views:

```text
All
Toilet
Litter Bin
Sweeping
```

Common KPIs:

```text
Total Inspections
Submitted
Not Submitted
QC Pending
Approved
Rejected
Action Required
Action Taken
```

Possible derived rates:

```text
Submission Rate = Submitted / Expected
QC Approval Rate = Approved / QC Processed
Rejection Rate = Rejected / QC Processed
Action Closure Rate = Action Taken / Action Required
```

Do not implement these formulas blindly if backend already exposes canonical metrics. Backend is preferred source of truth.

---

# 16. Supervisor Performance Logic

Supervisor performance is multi-dimensional.

Possible inputs already consistent with MatrixTrack context:

- expected work,
- submitted work,
- missing work,
- approval rate,
- rejection rate,
- recurring failures,
- Action Required originating from assigned assets,
- attendance of mapped workforce,
- beat coverage,
- timeliness.

Important rule:

**Do not invent a supervisor score or threshold without an approved business formula.**

If labels such as:

```text
Excellent
Good
Needs Attention
Critical
```

are used, thresholds must be explicitly defined and consistently applied.

---

# 17. Employee Performance Logic

Employee performance should rely on signals the employee actually controls.

Potential signals:

- attendance consistency,
- assigned beat/work participation,
- deployment,
- repeated absence,
- work completion data where attribution exists.

Do not attribute supervisor-level inspection rejection directly to an employee unless the underlying data establishes that relationship.

---

# 18. Ward Ranking Business Logic

Ward Ranking is a comparative performance engine.

It combines role/module operational signals into a ward-level score/ranking.

Critical architectural rule:

```text
Backend scoring logic = source of truth
Frontend = display + drill-down
```

Do not independently reproduce scoring formulas in frontend unless specifically required.

## 18.1 Ranking Requirements

A ranking response should support:

- Ward identity.
- Score.
- Rank.
- Metric breakdown.
- Selected date/range.
- Role/module dimension where relevant.
- Explanation of why the score exists.
- Drill-down.

## 18.2 Ranking Order

General expected behavior:

- Higher score should rank higher unless metric definition says otherwise.
- Tie behavior should be deterministic.
- Missing data must be treated consistently.
- Date filters must affect both score and supporting metrics.
- A ward must not appear under the wrong zone.

## 18.3 Role Dimensions

Existing contexts include:

- Supervisor dimension.
- QC dimension.
- Action Officer dimension.
- Executive overview.

Action Officer indicators include:

- Action Required.
- Action Pending.
- Action Taken.
- On-time Completion.

Exact weights and formulas must come from current backend scoring/service implementation.

---

# 19. Executive Dashboard Logic

The Commissioner/ULB dashboard must prioritize:

```text
1. Exceptions
2. Changes
3. KPIs
4. Trends
5. Geographic performance
6. Supervisor performance
7. Open actions
8. Drill-down
```

A KPI should ideally be drillable.

Example:

```text
Rejected Inspections
   ↓
Zone
   ↓
Ward
   ↓
Supervisor
   ↓
Asset/Beat
   ↓
Inspection
   ↓
Evidence + QC Remark
```

---

# 20. Login Brief / Executive Popup Logic

The proposed login brief should not replicate the full dashboard.

Its purpose is to answer:

```text
What needs my attention right now?
```

Candidate verified data categories:

- workforce status,
- inspection completion,
- critical rejection count,
- open Action Required,
- ward requiring attention,
- supervisor requiring attention,
- strongest ward,
- unusual performance change.

Only show data supported by backend metrics.

---

# 21. Filtering Rules

Filters should be hierarchical.

Example:

```text
City → Zone → Ward → Supervisor → Asset/Beat
```

If Zone changes:

- Ward options must refresh to wards in that zone.
- Existing incompatible Ward selection must be cleared or revalidated.
- Supervisor/asset filters should refresh accordingly.

Date filtering:

- Must be applied consistently to KPI, table, chart, ranking, and drill-down.
- Never show totals from one range and rows from another range.

---

# 22. Search and Sorting Rules

Where users requested management tables:

- Support useful text search.
- Alphabetical list views should sort A–Z where required.
- Null/blank names should not break sorting.
- Avoid frontend sorting that contradicts backend pagination unless the complete dataset is loaded.

---

# 23. Deletion / Trash / Recovery Logic

Destructive actions should not happen accidentally.

Expected UX/business rules:

1. User requests deletion.
2. Confirmation is shown.
3. If soft delete/trash is supported, record moves to recoverable state.
4. Trash Hub shows eligible deleted items.
5. Recovery window/message follows current product rule.
6. Restore should revalidate uniqueness/relationships.
7. Audit log records deletion/restoration.

A 10-day recovery concept has been discussed; confirm current implementation before enforcing it server-side.

---

# 24. Audit Logging Logic

Important administrative and workflow changes should be traceable.

Audit record should ideally identify:

- Actor.
- Action.
- Entity type.
- Entity ID.
- Timestamp.
- Before/after or relevant details where supported.
- Request/context metadata where appropriate.

Examples:

- user created/updated/deleted,
- beat assignment changed,
- inspection QC processed,
- Action Required created,
- Action Taken completed,
- important master data changed.

Never erase audit history as part of normal record deletion.

---

# 25. Authentication and Authorization Logic

Authentication determines who the user is.

Authorization determines what that user can do.

Never rely only on frontend hiding.

Backend must enforce:

- role,
- city scope,
- module access,
- geographic scope,
- entity ownership/assignment where required.

Portal/module contexts that have existed include:

```text
TASKFORCE_20
MATRIX_TRACK
WARD_RANKING
```

Do not confuse portal assignment with role.

---

# 26. Mobile Role Routing Logic

Mobile routes depend on role/module context.

Existing concepts include:

```text
ULB → RoleUlbDashboard
QC → RoleQcDashboard
AO → RoleAoDashboard
```

Do not modify a common wrapper without testing every affected role/module.

---

# 27. Data Consistency Rules

The following relationships must remain synchronized:

```text
Zone ↔ Ward
Ward ↔ Beat
Ward ↔ Toilet
Ward ↔ Litter Bin
Supervisor ↔ Assignment
Employee ↔ Assignment
Inspection ↔ Asset/Beat
Inspection ↔ Supervisor
QC record ↔ Inspection
Action record ↔ Inspection
```

Common failure cases to prevent:

- edited ward not reflected elsewhere,
- deleted user still selectable,
- supervisor shown in wrong ward,
- stale mobile assignment,
- frontend showing obsolete master values,
- duplicate assignment.

---

# 28. Geographic / Map Logic

Where maps are used:

- Current location permission/error state must be handled.
- Asset/beat coordinates must be valid before drawing routes.
- Completed/Pending marker status must be derived from current relevant data.
- Location events must be correctly typed in TypeScript/React Native.
- Same latitude/longitude can legitimately represent vertically separated assets (e.g. different floors); unique asset IDs remain authoritative.

---

# 29. Status Integrity Rules

Avoid impossible transitions.

Examples:

Invalid:

```text
Unsubmitted → Action Taken
QC Pending → Action Taken
Action Taken → QC Pending
```

Normal logical progression:

```text
Submitted
→ QC Pending
→ Approved/Rejected
→ Action Required (optional ULB escalation)
→ Action Taken
```

If reopening/reinspection exists, implement it as an explicit business transition, not arbitrary status overwrite.

---

# 30. KPI Integrity Rules

Every KPI must define:

- numerator,
- denominator,
- applicable date range,
- status inclusion/exclusion,
- module scope,
- geographic scope.

Examples of dangerous mistakes:

- Approved / Total when Total includes Not Submitted unexpectedly.
- Action Taken / All inspections instead of Action Required.
- Ward score calculated across mismatched dates.
- Supervisor approval rate including QC Pending in denominator.

Prefer server-calculated metrics when they already exist.

---

# 31. AI Insight Business Rules

AI executive insights must remain grounded in data.

AI may:

- identify patterns,
- summarize trends,
- highlight anomalies,
- suggest investigation,
- propose corrective action text.

AI must not:

- invent records,
- invent causes,
- alter official statuses,
- fabricate Ward Ranking scores,
- mark attendance,
- approve/reject inspections,
- close actions automatically unless explicitly designed and authorized.

A good insight includes:

```text
What changed?
Where?
By how much?
Possible data-supported reason?
Recommended management check?
```

---

# 32. Processing Plant — Business Logic Status

**Processing Plant business logic is currently NOT defined in the verified MatrixTrack 2.0 context available as of 8 September 2026.**

Therefore:

```text
PROCESSING_PLANT_STATUS = REQUIREMENTS_PENDING
```

Do not invent:

- plant categories,
- weighbridge workflow,
- waste quantities,
- MRF logic,
- compost logic,
- biomethanation logic,
- vehicle unloading logic,
- plant efficiency scoring,
- downtime logic,
- QC rules.

When Processing Plant requirements are provided, they should be integrated into the same governance model:

```text
Operational Data
→ Inspection/Verification
→ Performance
→ Exception
→ Action Required
→ Resolution
→ Executive Reporting
```

---

# 33. Business Logic Change-Safety Rules

Any AI/developer modifying MatrixTrack must follow:

1. Read current file before changing it.
2. Understand existing API contract.
3. Understand role guards.
4. Understand city/module scope.
5. Preserve existing auth/session behavior.
6. Preserve unrelated UI/logic.
7. Do not replace a complex file with simplified mock logic.
8. Do not invent backend fields.
9. Do not duplicate scoring logic in frontend.
10. Do not merge QC and ULB responsibilities.
11. Do not allow AO to process non-Action-Required records.
12. Do not break historical data.
13. Do not silently change enum/status meanings.
14. Preserve auditability.
15. Validate TypeScript/build after change.
16. Test the complete end-to-end workflow.

---

# 34. End-to-End Acceptance Flow

A full regression path should validate:

```text
1. Supervisor logs in.
2. Correct module/assignment is visible.
3. Supervisor captures valid evidence.
4. Submission succeeds.
5. QC sees the record.
6. QC approves or rejects.
7. QC remark persists.
8. ULB sees the processed record.
9. ULB can inspect evidence + QC context.
10. AI suggestion works if module supports it.
11. ULB marks Action Required.
12. AO sees the Action Required record.
13. AO records corrective action.
14. Record becomes Action Taken.
15. ULB sees resolved state.
16. Inspection & Performance KPIs update.
17. Ward Ranking reflects backend logic.
18. Audit trail remains correct.
```

---

# 35. Attendance Acceptance Flow

```text
1. Attendance is available for selected date.
2. Calendar shows correct color.
3. Future dates remain neutral.
4. Zone filter narrows Ward options.
5. Ward filter updates metrics and rows.
6. Present/Absent totals reconcile.
7. Punch-out compliance reconciles.
8. GPS compliance reconciles.
9. 7-day comparison uses correct days.
10. Executive exception list links to underlying workers/data.
```

---

# 36. Ward Ranking Acceptance Flow

```text
1. Select date/range.
2. Backend calculates metrics.
3. Wards are sorted by canonical score.
4. Rank numbers are deterministic.
5. Score breakdown matches backend.
6. Zone/Ward mapping is correct.
7. Drill-down metrics reconcile with inspection/action data.
8. Role-specific views show only relevant metrics.
9. Filter changes recalculate consistently.
```

---

# 37. Core Invariants

The following should always remain true:

```text
QC != ULB
ULB != AO
Frontend score display != source-of-truth scoring engine
AI suggestion != official decision
Attendance != inspection
Inspection evidence != QC approval
QC rejection != automatic corrective action unless explicitly configured
Action Required != Action Taken
Deleted != necessarily permanently destroyed
Role != portal/module assignment
Asset ID != map coordinate
```

---

# 38. Compact Business Logic Summary

MatrixTrack 2.0 runs on the following core logic:

```text
Assign the right people
      ↓
Verify workforce attendance
      ↓
Show users only their scoped work
      ↓
Capture daily field evidence
      ↓
Validate and submit evidence
      ↓
QC approves/rejects
      ↓
ULB decides whether intervention is needed
      ↓
Action Officer resolves escalated issues
      ↓
System calculates performance
      ↓
Ward Ranking compares administrative areas
      ↓
Commissioner sees exceptions, trends and drill-down
```

The platform must preserve **traceability, role separation, geographic scope, historical evidence, and backend-authoritative metrics** at every step.

---

# 39. Instruction to Any AI Using This File

When working on MatrixTrack 2.0:

- Use this file for business-flow understanding.
- Use the latest code/repository as technical source of truth.
- If this document and current code disagree, identify the discrepancy instead of silently changing working production logic.
- Do not invent missing Processing Plant requirements.
- Ask for or inspect the relevant current file before giving replacement code when possible.
- Make the smallest safe change required.

**Written by Vani Sharma**