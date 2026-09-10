# MATRIXTRACK 2.0 — MASTER PROJECT CONTEXT

## 1. What MatrixTrack 2.0 Is

**MatrixTrack 2.0 is a municipal cleanliness operations, inspection, accountability, attendance, performance-monitoring, and governance platform.**

It is not simply an inspection application.

The purpose of MatrixTrack 2.0 is to give municipal leadership—from field supervisors through ULB officers and commissioners—a real-time operational picture of:

- whether sanitation work is actually happening,
- whether employees are present,
- whether assets and locations are being inspected,
- whether supervisors are performing,
- whether QC is approving/rejecting field work,
- which issues require corrective action,
- whether those corrective actions are completed,
- how wards are performing relative to each other,
- where municipal leadership needs to intervene,
- and eventually how all cleanliness-related operational systems can be viewed through one executive command layer.

The system is intended to move municipal sanitation management from:

**manual reporting → digital evidence → verification → accountability → corrective action → performance intelligence.**

---

# 2. Current Pilot Context

The primary MatrixTrack 2.0 city context is:

**City:** Ujjain  
**Zones:** 6  
**Wards:** 54  
**Supervisors / Darogas:** 58  
**Action Officers / IEC Members:** 96  
**Quality Controllers / Health Officers:** 21  
**Road Sweeping Employees:** 1,429  
**Registered Litter Bins:** 351  
**Registered Toilets:** 84  
**Registered Beats:** 816

The system architecture must remain flexible enough to support additional cities later.

Therefore, do not hard-code Ujjain-specific assumptions into reusable business logic unless explicitly required.

---

# 3. Overall Administrative Hierarchy

The operational hierarchy should be understood broadly as:

```text
Municipal / HMS Super Admin
        ↓
City
        ↓
City Administration / Commissioner / ULB Leadership
        ↓
Zone
        ↓
Ward
        ↓
Area / Beat / Asset
        ↓
Supervisor
        ↓
Employee / Sanitation Worker
```

Depending on the module, the operational object may be:

```text
Ward
 ├── Sweeping Beats
 ├── Toilets
 ├── Litter Bins
 └── Other cleanliness assets/modules
```

The system must respect:

- city scope,
- zone scope,
- ward scope,
- role scope,
- module assignment,
- asset assignment,
- employee/supervisor assignment.

Never show users data they should not have access to.

---

# 4. Main Platforms

MatrixTrack 2.0 currently consists primarily of three technical surfaces.

## A. Web Application

Primarily used by:

- HMS Super Admin
- City Admin
- Commissioner
- ULB Officer
- QC
- Action Officer
- management users

Technology:

**Next.js / React web frontend**

Major functions include:

- Dashboard
- Registered Users
- Areas
- Zones
- Wards
- Beats
- Attendance Analytics
- Inspection & Performance
- Ward Ranking
- Audit Logs
- Trash Hub / recovery functionality
- Profile
- administrative masters
- module configuration

---

## B. Mobile Application

Used primarily by field-operational roles.

Technology:

**React Native + Expo**

Current major field modules:

- Sweeping
- Toilets
- Litter Bins

Mobile application supports:

- English
- Hindi

Recent functionality also includes **speech-to-text voice input** using Expo speech recognition.

---

## C. Backend

Backend is Node/TypeScript based with Prisma and PostgreSQL.

The backend manages:

- authentication,
- role authorization,
- module access,
- inspections,
- QC processing,
- action workflows,
- attendance-related APIs,
- assignments,
- beats,
- assets,
- Ward Ranking calculations,
- AI-assisted features,
- audit-related data,
- mobile/web integration.

Prisma migrations are important and existing production schema must never be casually changed.

---

# 5. Core Roles

The important MatrixTrack 2.0 roles include:

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

Additional portal keys / application contexts have existed such as:

```text
TASKFORCE_20
MATRIX_TRACK
WARD_RANKING
```

Role/module scoping must always be preserved.

---

# 6. HMS SUPER ADMIN

The Super Admin is effectively the highest system-management level.

Typical responsibilities include:

- managing cities,
- managing administrative users,
- managing modules,
- viewing overall system data,
- controlling configuration,
- potentially managing access across multiple municipal deployments.

Changes made for a city-specific workflow must not accidentally affect Super Admin behavior.

---

# 7. CITY ADMIN

The City Admin is responsible for operational/master administration within one city.

City Admin functionality includes things such as:

- users,
- zones,
- wards,
- areas,
- beats,
- module-related registrations,
- employee/supervisor mappings,
- attendance,
- configuration.

Examples of existing web routes/context include:

```text
/city
/city/users
/city/areas
/city/wards
/city/zones
/city/beats
/city/beat-status
/city/beat-requests
/city/attendance
```

Recent UI expectations include:

- date filters,
- alphabetical A–Z sorting,
- searchable filters,
- clean tables,
- confirmation before destructive actions,
- recoverability messaging,
- correct role/module labels,
- professional administrative UI.

---

# 8. COMMISSIONER / ULB LEADERSHIP

The Commissioner-level experience should not behave like another operational table.

This role requires an **executive command dashboard**.

When a Commissioner or senior ULB officer logs in, the application should quickly answer:

```text
What happened today?
Is the city performing normally?
Where is performance dropping?
Which wards/zones need attention?
Which supervisors are underperforming?
How many inspections failed?
How many corrective actions are still pending?
What should I act on first?
```

The current ULB dashboard is being upgraded from a basic dashboard toward a premium decision-support experience.

Desired elements include:

- executive summary,
- important alerts,
- today's operational snapshot,
- attendance performance,
- inspection performance,
- supervisor performance,
- employee performance,
- Ward Ranking,
- Action Required items,
- AI insights,
- trends,
- exceptions,
- risk areas.

A login popup / executive briefing concept has also been discussed so that the ULB/Commissioner immediately sees the most important city-level information after login.

The UI should feel like a **municipal command centre**, not a basic CRUD admin panel.

---

# 9. CURRENT FIELD MODULES

Three primary cleanliness inspection modules currently exist.

```text
1. Sweeping
2. Toilets
3. Litter Bins / Twin Bins
```

Each module has its own operational details, but they feed into the same accountability chain.

Typical lifecycle:

```text
Field Work
   ↓
Supervisor Submission
   ↓
QC Review / Auto-QC where applicable
   ↓
Approved or Rejected
   ↓
ULB Review
   ↓
Action Required if necessary
   ↓
Action Officer
   ↓
Corrective Action
   ↓
Action Taken / Resolution
```

---

# 10. SWEEPING MODULE

Sweeping is based around **beats**.

A ward contains multiple sweeping beats.

Employees/supervisors are mapped to beats.

## Sweeping inspection/evidence model

Current important rule:

**Each beat has 5 inspection/evidence points.**

The supervisor captures evidence against these points.

Previously established visual/evidence logic included:

- single submission per point per day,
- photographic evidence,
- minimum photo expectations,
- completion/progress indicators,
- map-based monitoring.

An earlier evidence-progress convention included:

```text
0 photos → Yellow
up to 3 → Amber
above 3 → Green
```

The exact implementation should always be checked against current code before changing it.

---

# 11. SWEEPING MAP

The mobile sweeping experience includes map-based beat functionality.

Important concepts:

- assigned beats,
- beat location/geography,
- employee/supervisor beat responsibility,
- progress,
- point evidence,
- daily submissions.

KML/KMZ-based beat geography has also been part of the broader MatrixTrack data context.

---

# 12. TOILET MODULE

Registered municipal/public toilets are mapped into the system.

Supervisors inspect toilets through the mobile application.

Typical operational data includes:

- toilet/location,
- inspection,
- images/evidence,
- cleanliness status,
- submission,
- QC status,
- remarks,
- actions.

Map behavior has included:

```text
Completed → Green
Pending → Red
```

and visual guidance/location routing toward pending toilets.

---

# 13. LITTER BIN / TWINBIN MODULE

The Litter Bin module tracks registered bins.

Current Ujjain master count:

**351 registered litter bins**

The mobile workflow similarly supports:

- assigned bins,
- inspection,
- evidence,
- status,
- map view,
- completion.

Map behavior includes:

```text
Completed → Green
Pending → Red
```

A dotted route/location indicator has been used between the user's current location and a pending asset.

---

# 14. AI IMAGE VALIDATION

MatrixTrack 2.0 has also been working toward AI-based image validation.

Purpose:

Prevent field users from uploading irrelevant/wrong images just to complete an inspection.

The concept applies across:

- Sweeping
- Toilets
- Litter Bins

The backend has had image-validation-related environment configuration, including GPT-based image understanding.

At one stage, wrong images were still being accepted, so this feature has required further validation/testing.

When modifying this feature:

- never block legitimate submissions unnecessarily,
- preserve current inspection flows,
- ensure errors are understandable,
- ensure fallback/error behavior is safe,
- do not silently bypass validation.

---

# 15. INSPECTION & PERFORMANCE

This is one of the most important ULB Officer / management modules.

The purpose is NOT simply to list inspection records.

It should answer:

```text
How much field work occurred?
How much was successfully submitted?
How much was approved?
How much failed quality checks?
Where are recurring failures occurring?
Who is performing well?
Who needs intervention?
Which module is generating the most problems?
How quickly are problems resolved?
```

---

# 16. INSPECTION & PERFORMANCE — MAIN FILTERS

The ULB inspection workspace has been designed around:

### Date range

Users should be able to choose:

```text
Start Date → End Date
```

### Module tabs

```text
All
Toilet
Litter Bin
Sweeping
```

### Search

Search relevant records/assets/users.

Potential scope filters include:

- Zone
- Ward
- Supervisor
- Module
- Status

depending on the page/context.

---

# 17. INSPECTION & PERFORMANCE — KEY STATUSES

Important operational statuses include:

```text
Approved
Rejected
Action Required
Action Taken
```

A ULB officer needs to move beyond QC outcome and decide whether something needs municipal intervention.

Therefore:

**QC status and municipal Action Required status are separate concepts.**

---

# 18. QC WORKFLOW

QC's role is to verify quality.

The key principle is:

**QC should only Approve or Reject.**

QC should NOT be responsible for the municipal corrective-action decision.

Earlier "Action Required" behavior was removed from QC.

Therefore:

```text
Supervisor Submission
       ↓
      QC
   ↙       ↘
Approved   Rejected
```

QC may provide a remark explaining the decision.

---

# 19. ULB OFFICER WORKFLOW

Once QC has processed the report, the ULB Officer can review it.

ULB Officer tabs include concepts such as:

```text
Approved
Rejected
Action Required
```

The ULB Officer may take an Approved or Rejected QC record and decide:

**This issue requires corrective action.**

That record then becomes:

```text
ACTION REQUIRED
```

and enters the Action Officer workflow.

This separation is important.

Do not merge QC and ULB decision-making.

---

# 20. ACTION OFFICER WORKFLOW

Action Officers handle records marked Action Required.

Conceptually:

```text
ULB identifies problem
       ↓
Action Required
       ↓
Action Officer receives issue
       ↓
Action Officer performs corrective action
       ↓
Action Taken / Completed
```

The system should track:

- who handled it,
- when it was assigned/processed,
- current status,
- action remarks,
- completion,
- timeliness.

---

# 21. AI ACTION SUGGESTIONS

MatrixTrack includes AI assistance for corrective actions.

For certain inspection records, AI can generate a suggested corrective action based on information such as:

- QC outcome,
- QC remarks,
- inspection observations,
- evidence/context.

For Sweeping, an endpoint/context has existed similar to:

```text
POST /modules/SWEEPING/records/:id/action-ai
```

The AI suggestion is meant to assist the ULB officer.

It should NOT blindly take action without human review.

Typical concept:

```text
Inspection failed / concern detected
        ↓
AI reads inspection + QC context
        ↓
Suggested corrective action
        ↓
ULB officer reviews
        ↓
Action Required
```

---

# 22. INSPECTION PERFORMANCE KPIs

The Inspection & Performance experience should be able to surface metrics such as:

- Total inspections
- Submitted inspections
- Not submitted
- QC pending
- Approved
- Rejected
- Action Required
- Action Taken
- Pending corrective actions
- first-time approvals
- repeated failures
- completion percentage
- QC approval rate
- rejection rate
- corrective action completion rate
- supervisor performance
- ward performance

Specific KPI definitions should always follow backend logic rather than arbitrary frontend calculations.

---

# 23. TOILET PERFORMANCE CONCEPT

For Toilets, performance analysis has specifically discussed metrics such as:

```text
Total inspections
Submitted
Not submitted
QC pending
Approved
Rejected
Complaint-related
Non-complaint
First-time approval
Reviewed / repeated inspections
Quality insights
```

The intent is to measure not merely quantity but **quality and compliance**.

---

# 24. SUPERVISOR PERFORMANCE

Supervisor performance is becoming an important executive feature.

A supervisor should not be evaluated purely on one number.

Potential verified operational signals already available within MatrixTrack include:

- assigned work,
- inspections expected,
- inspections completed,
- missing submissions,
- approval percentage,
- rejection percentage,
- Action Required generated from their areas/assets,
- recurring failures,
- attendance of assigned employees,
- beat coverage,
- timeliness.

The ULB dashboard is being extended so leadership can identify:

```text
Top performing supervisors
Supervisors requiring attention
Trend in supervisor performance
```

The UI should show this professionally and avoid unnecessarily shaming users.

Use concepts such as:

```text
Excellent
Good
Needs Attention
Critical
```

only if they are backed by defined thresholds.

Do not invent scoring thresholds without product/business approval.

---

# 25. EMPLOYEE PERFORMANCE

Employee-level performance is also relevant.

The leadership view may need:

- attendance,
- assigned beat,
- work participation,
- consistency,
- location/assignment coverage,
- supervisor mapping.

Employee performance should be interpreted carefully because inspection responsibility often sits with supervisors rather than the worker directly.

---

# 26. ATTENDANCE ANALYTICS

Attendance is another major MatrixTrack 2.0 vertical.

It should provide management-level understanding of workforce availability and compliance.

The purpose is to answer:

```text
How many workers were actually on the ground?
How does today compare with normal attendance?
Which zone or ward has poor turnout?
Are punches complete?
Is GPS evidence being captured?
Are there employees repeatedly missing attendance?
```

---

# 27. ATTENDANCE CALENDAR

The attendance page uses a visual calendar.

Expected semantics include:

```text
Green → Attendance uploaded / available
Red   → Attendance not uploaded / missing
White → Future date
```

A legend should make the meaning obvious.

---

# 28. ATTENDANCE FILTERING

Attendance analytics should support useful filters while avoiding unnecessary complexity.

Historically requested improvements include:

- searchable dropdowns,
- Zone
- Ward
- date/range
- employee/designation relevant filters.

Unnecessary fields such as Office/Division were removed in earlier iterations.

---

# 29. ATTENDANCE PERFORMANCE

One requested view is **Employee Designation Performance**.

It should be ordered:

```text
Highest performance
        ↓
Lowest performance
```

Tables should use available horizontal space instead of appearing unnecessarily narrow.

---

# 30. COMMISSIONER ATTENDANCE BRIEF

A Commissioner-style Daily Brief has been conceptualized around executive attendance metrics.

Examples include:

### Headline

```text
Workers on ground today
vs
7-day average
```

### Zone-wise turnout

For every zone:

```text
Today's turnout
vs
7-day average
```

### Compliance indicators

```text
Attendance compliance
Punch-out compliance
GPS capture %
```

### Highlight

```text
Best performing zone
Zone requiring attention
```

### Action Required

For example:

```text
Employees with no attendance for X consecutive days
```

The focus should be actionable exceptions rather than raw attendance dumps.

---

# 31. ZONE COMMISSIONER VIEW

For a Zone Commissioner, the same executive model should drill down into:

```text
Ward / Prabhag level
```

instead of showing unnecessary city-wide detail.

The hierarchy should therefore support executive drill-down:

```text
City
  ↓
Zone
  ↓
Ward / Prabhag
  ↓
Supervisor
  ↓
Employee
```

---

# 32. WARD RANKING

Ward Ranking is another core MatrixTrack intelligence layer.

Its goal is to turn multiple operational metrics into a comparable performance view of wards.

It is NOT simply a leaderboard for appearance.

The ranking should help municipal leadership answer:

```text
Which ward is performing best?
Why?
Which ward is deteriorating?
What metric is causing the decline?
Which operational role needs intervention?
```

---

# 33. WARD RANKING EXECUTIVE OVERVIEW

An executive Ward Ranking page has been created/reworked.

Its experience should include:

- ranking overview,
- key ward metrics,
- score breakdown,
- trend,
- drill-down,
- clear score explanations,
- filters,
- performance indicators.

A `WardExecutiveOverview` screen/component has existed in the frontend.

---

# 34. WARD RANKING ROLE VIEWS

Different users should see relevant ranking data.

Views have been worked on for:

- Supervisor
- QC
- Action Officer
- Executive / ULB level

The UI has been redesigned to use:

- compact cards,
- filters,
- score guides,
- better drill-down.

---

# 35. WARD RANKING — SUPERVISOR DIMENSION

Supervisor-related metrics may incorporate operational performance such as:

- expected inspections,
- completed inspections,
- quality,
- approval,
- rejection,
- compliance.

The system should explain why a score exists rather than presenting a mysterious number.

---

# 36. WARD RANKING — QC DIMENSION

QC performance relates to quality-control processing.

Possible signals include:

- number reviewed,
- pending,
- approval/rejection handling,
- timeliness,
- inspection quality workflow.

Any exact scoring formula must be sourced from existing backend scoring logic.

Do not recreate scoring formulas independently in frontend code.

---

# 37. WARD RANKING — ACTION OFFICER DIMENSION

Action Officer metrics include concepts such as:

```text
Action Required
Action Pending
Action Taken
On-time Completion
```

A previously discussed fallback for on-time completion used a **2-day window**, but the current backend implementation must be verified before relying on this rule.

---

# 38. WARD RANKING SCORING

Scoring is handled in backend service/scoring logic.

Therefore:

```text
Backend = source of truth for scoring.
Frontend = presentation.
```

The frontend should not invent or duplicate business formulas unless intentionally designed that way.

Whenever Ward Ranking is changed, verify:

- score calculation,
- normalization,
- role metrics,
- missing data,
- date range,
- ranking order,
- tied scores,
- ward mapping,
- filters.

---

# 39. EXECUTIVE DASHBOARD PHILOSOPHY

Across MatrixTrack 2.0, dashboards should follow this hierarchy:

```text
1. What requires attention?
2. What changed?
3. How are we performing?
4. Where is the problem?
5. Who owns it?
6. What action should happen?
7. Allow drill-down to evidence.
```

Do not begin an executive dashboard with huge raw tables.

The ideal experience is:

```text
Executive Summary
       ↓
Critical Alerts
       ↓
KPIs
       ↓
Trends
       ↓
Zone/Ward comparison
       ↓
Supervisor performance
       ↓
Action Required
       ↓
Detailed operational records
```

---

# 40. ULB DASHBOARD UI DIRECTION

MatrixTrack 2.0 UI should look:

- premium,
- government-enterprise ready,
- modern,
- clean,
- information dense without becoming cluttered,
- professional,
- trustworthy.

The current primary visual theme uses:

- white,
- neutral backgrounds,
- dark/deep indigo,
- subtle gradients,
- clean status colors.

Avoid excessive bright colors.

Use color meaningfully for:

```text
Success
Warning
Failure
Pending
Action Required
```

Cards should not all compete visually.

---

# 41. LOGIN EXECUTIVE POPUP

A new ULB/Commissioner concept discussed on September 8 is a popup after login.

This should function like a morning/current operational briefing.

Possible information based on already available MatrixTrack context:

```text
Today's workforce status
Inspection completion
Critical rejections
Open Action Required
Ward requiring attention
Supervisor requiring attention
Best performing ward
Important trend
```

The popup should not duplicate the entire dashboard.

Its function is:

**tell leadership what matters immediately.**

---

# 42. AUDIT LOGS

MatrixTrack also includes audit-log functionality.

Important actions should be traceable.

Examples:

- user creation/update/deletion,
- administrative changes,
- assignment modifications,
- inspection processing,
- actions,
- important system events.

Audit information should ideally answer:

```text
Who?
Did what?
When?
To which record?
From where/context?
```

Do not compromise audit history when changing CRUD workflows.

---

# 43. TRASH HUB / RECOVERY

A Trash Hub / recovery concept exists in the web portal.

Deleted records/users should be recoverable according to product rules instead of disappearing immediately without visibility.

A **10-day recovery-related message** has previously been discussed in the UI.

Deletion actions should have:

- confirmation,
- clear consequence messaging,
- recoverability where supported.

---

# 44. SIDEBAR INFORMATION ARCHITECTURE

The ULB/sidebar structure has been under refinement.

Primary operational modules should remain clearly separated from administrative/system utilities.

Conceptually:

```text
Dashboard

Active Modules
 ├── Attendance Analytics
 ├── Inspection & Performance
 ├── Ward Ranking
 └── other operational modules

Management / System
 ├── Trash Hub
 └── Audit Logs

My Profile
```

Exact names can evolve, but do not mix system utilities with active operational modules without reason.

---

# 45. REGISTERED USERS

Registered Users management includes various roles.

Recent requirements include:

- role tabs,
- ULB Officer support,
- date filtering,
- A–Z sorting,
- correctly capitalized names/usernames,
- delete confirmation,
- correct role labels,
- correct module/portal association,
- recoverability.

Be careful about distinguishing application role from portal/module assignment.

---

# 46. AREAS / WARDS / ZONES / BEATS

Administrative masters form the backbone of operations.

Relationships must remain consistent.

Conceptually:

```text
City
 └── Zone
      └── Ward
           ├── Area
           ├── Beat
           ├── Toilet
           ├── Litter Bin
           └── Assigned personnel
```

A change to a ward or assignment must be reflected wherever the record is consumed.

Avoid stale UI state and disconnected cached mappings.

---

# 47. BEAT ASSIGNMENTS

Sweeping employees and supervisors are related to beat assignments.

The app has screens/workflows around:

- assigned beats,
- beat requests,
- beat status,
- evidence.

Changes to assignments must not cause:

- incorrect employee mapping,
- duplicate assignments,
- inaccessible beats,
- wrong ward/zone scope.

---

# 48. DAILY SWEEPING EVIDENCE

The system should understand that sweeping is an operationally recurring activity.

Evidence is generally date-specific.

Queries should be aware of:

```text
today / selected date
```

and avoid mixing historical evidence with the current operational state.

---

# 49. MOBILE ROLE ROUTING

The mobile application uses role-aware/module-aware routing.

Examples of wrapper behavior have included:

```text
ULB → RoleUlbDashboard
QC → RoleQcDashboard
AO → RoleAoDashboard
```

for relevant modules.

Do not alter role routing casually when making UI changes.

---

# 50. API AND BUSINESS LOGIC PRINCIPLE

One of the strongest MatrixTrack development rules is:

> Preserve all existing APIs, auth/session flows, module access rules, role scope, backend logic, database relationships, and unrelated pages unless the requested task explicitly requires changing them.

Do not rewrite large areas merely to solve a small issue.

Prefer:

```text
minimum necessary change
+
maximum preservation of existing behavior
```

---

# 51. AUTHENTICATION

The system has a unified authentication/login context.

Important concerns include:

- role,
- portal,
- module access,
- city scope,
- stored session/token,
- mobile/web routing.

Do not introduce alternate login/session logic unless intentionally redesigning authentication.

---

# 52. SOURCE OF TRUTH

For MatrixTrack 2.0 code assistance, newer code must always override assumptions from older snippets.

As of the project history available on September 8, 2026:

The ZIPs shared on **September 3, 2026**:

```text
backend-matrixtrack 2,0.zip
frontend- matrixtrack 2.0.zip
```

were designated the current source-of-truth references for backend and web frontend at that point.

The mobile application exists separately in the MatrixTrack 2.0 App repository.

Any code shared after those snapshots should take precedence for the affected file/feature.

Never generate replacement files purely from remembered old code when the latest file is available.

---

# 53. RECENT MERGE / REGRESSION CONTEXT

Recent frontend work has touched areas such as:

- audit logs,
- PortalHomeLayout,
- registered users,
- toilet UI,
- beat assignments,
- areas,
- dashboard components,
- ULB report summaries,
- inspection performance.

Therefore, regression testing around these areas is important before deployment.

---

# 54. TESTING PHILOSOPHY

MatrixTrack 2.0 testing should cover complete role journeys, not merely whether a screen opens.

Example:

```text
Supervisor submits inspection
↓
Record appears for QC
↓
QC approves/rejects
↓
ULB sees processed record
↓
ULB marks Action Required
↓
AO sees it
↓
AO completes action
↓
ULB sees Action Taken
↓
Ward Ranking / metrics update correctly
```

This is more valuable than testing each page independently.

---

# 55. DRY-RUN TESTING

Before major APK/web deployments, test at least:

### Login

- every role can login,
- incorrect credentials behave correctly,
- user lands on correct dashboard,
- role/module restrictions work.

### Sweeping

- assigned beats appear,
- location/maps work,
- evidence can be captured,
- point submissions work,
- completion reflects correctly.

### Toilet

- assigned toilets,
- map,
- inspection,
- images,
- submission,
- QC flow.

### Litter Bin

- assigned bins,
- map,
- inspection,
- evidence,
- submission,
- QC flow.

### QC

- pending records,
- Approve,
- Reject,
- remarks,
- processed records.

### ULB

- Approved,
- Rejected,
- Action Required,
- AI suggestions,
- View details,
- correct QC remarks.

### AO

- Action Required records,
- action completion,
- Action Taken status.

### Attendance

- calendar,
- filters,
- totals,
- employee/zone/ward data.

### Ward Ranking

- rankings,
- scores,
- filters,
- drill-down,
- role-specific metrics.

---

# 56. AI USAGE PHILOSOPHY

AI in MatrixTrack should support human decision-making.

Current/possible AI responsibilities include:

- image validation,
- inspection-quality interpretation,
- corrective-action suggestions,
- executive insights,
- identifying unusual patterns.

AI should NOT become the source of truth for:

- attendance records,
- assignments,
- inspection status,
- official scoring,
- QC decisions,
- action completion.

Those must come from system data/business logic.

---

# 57. AI EXECUTIVE INSIGHTS

A strong MatrixTrack executive insight should be specific.

Bad:

```text
Performance needs improvement.
```

Good:

```text
Ward 12's inspection approval rate fell from 89% to 71% over the selected period, primarily due to repeated Sweeping rejections.
```

Ideal AI insights answer:

```text
What changed?
Where?
Why?
Who is affected?
What should management inspect?
```

They should only claim causes supported by data.

---

# 58. PROCESSING PLANT MODULE

## IMPORTANT STATUS

A detailed **MatrixTrack 2.0 Processing Plant workflow has NOT been captured in the verified project context available to this AI as of September 8, 2026.**

Therefore, another AI must NOT assume that Processing Plant currently means:

- MRF,
- compost plant,
- transfer station,
- waste-to-energy plant,
- biomethanation,
- weighbridge,
- wet/dry waste processing,
- vehicle unloading,

unless the product owner explicitly provides those requirements.

Use this status:

```text
PROCESSING PLANT
Status: Product context pending / requirements to be appended.
```

When the Processing Plant requirements are supplied, integrate them under the same MatrixTrack governance hierarchy instead of building an isolated application.

Likely integration points should be identified only after requirements are confirmed:

```text
Dashboard
Inspection & Performance
Ward/Zone attribution
Plant KPIs
QC
Action Required
Action Officer
Executive insights
Reports
Audit trail
```

But do not invent exact plant KPIs or workflows.

---

# 59. REPORTING PRINCIPLE

MatrixTrack reporting should distinguish between:

```text
Raw data
Operational KPI
Performance metric
Exception
Insight
Action
```

Example:

```text
Raw:
18 rejected inspections

KPI:
Approval rate 81%

Exception:
Ward 7 has 6 rejections

Insight:
4 of the 6 relate to Sweeping

Action:
Review Supervisor X / Beat Y
```

This transformation from records into management intelligence is a central product goal.

---

# 60. DATA DRILL-DOWN

Every high-level KPI should ideally drill down.

Example:

```text
City inspection rate
   ↓
Zone
   ↓
Ward
   ↓
Supervisor
   ↓
Beat / Toilet / Litter Bin
   ↓
Individual inspection
   ↓
Evidence / remarks / action
```

This prevents executive numbers from becoming unverifiable.

---

# 61. STATUS COLOR CONSISTENCY

Use semantic colors consistently.

Typical meaning:

```text
Green  = Approved / Completed / Healthy
Red    = Rejected / Critical
Amber  = Warning / Pending attention
Blue/Indigo = Primary information / navigation
Gray   = Neutral / inactive
```

Do not use random colors for visual decoration that undermine status meaning.

---

# 62. PROFESSIONAL UI EXPECTATION

The user repeatedly prefers interfaces that look:

```text
Premium
Professional
Clean
Modern
Government-enterprise grade
Executive
Not basic
```

Avoid:

- oversized cards,
- excessive gradients,
- random colorful tiles,
- empty space,
- repetitive KPIs,
- weak hierarchy,
- overly rounded toy-like components.

Prefer:

- clear hierarchy,
- compact scorecards,
- meaningful charts,
- strong typography,
- subtle gradients,
- responsive tables,
- drill-down,
- polished empty/loading states.

---

# 63. CHANGE-SAFETY RULE

This rule should be placed at the top of any coding request to another AI:

**Do not break existing MatrixTrack 2.0 functionality.**

When modifying a file:

1. Understand existing logic.
2. Identify only the requested change.
3. Preserve existing imports unless unnecessary.
4. Preserve APIs.
5. Preserve role logic.
6. Preserve permissions.
7. Preserve navigation.
8. Preserve existing filters.
9. Preserve business calculations.
10. Preserve unrelated UI.
11. Avoid replacing a large working component with simplified code.
12. Type-check after changes.
13. Run `git diff --check`.
14. Verify affected role flows.

---

# 64. REPLACEMENT CODE EXPECTATION

When providing a full replacement file:

- it must actually contain all existing logic,
- it must not shrink away important functionality,
- it must not duplicate thousands of lines accidentally,
- it must not contain conflict markers,
- it must compile,
- it must preserve incoming + existing branch logic where merges are involved.

Never claim "ready to paste" unless the complete file has been checked against the supplied source.

---

# 65. GIT / MERGE PHILOSOPHY

The project is actively developed through Git branches and PRs.

When resolving conflicts:

```text
Do not choose "ours" or "theirs" blindly.
```

The goal is usually:

**preserve both valid feature sets.**

After merges:

```bash
npx tsc --noEmit
git diff --check
git status -sb
```

and relevant build/runtime tests should be performed.

---

# 66. ENVIRONMENT / SECURITY

Environment files contain runtime configuration and should not be committed.

`.env` should remain Git-ignored.

Production secrets/configuration must not be hard-coded.

The application has used AWS infrastructure including:

- EC2
- private PostgreSQL/RDS
- PM2
- SSM tunnelling
- security groups

Infrastructure changes should preserve security and role separation.

---

# 67. HIGH-LEVEL PRODUCT LOOP

The best single mental model of MatrixTrack 2.0 is:

```text
PLAN
  ↓
ASSIGN
  ↓
ATTEND
  ↓
EXECUTE
  ↓
CAPTURE EVIDENCE
  ↓
INSPECT
  ↓
QC VERIFY
  ↓
MEASURE PERFORMANCE
  ↓
IDENTIFY EXCEPTIONS
  ↓
ACTION REQUIRED
  ↓
RESOLVE
  ↓
RANK / ANALYZE
  ↓
MANAGEMENT DECISION
```

That is the product.

---

# 68. RELATIONSHIP BETWEEN MAJOR MODULES

Do not treat Attendance, Inspection & Performance, and Ward Ranking as independent applications.

They form one management chain.

For example:

```text
Attendance
→ Were enough employees present?

Sweeping/Toilet/Litter Bin
→ Did operational work get inspected?

QC
→ Was the work acceptable?

Inspection & Performance
→ How well did teams perform?

Action Required
→ What failed badly enough to require intervention?

AO
→ Was the problem resolved?

Ward Ranking
→ Which administrative area is consistently performing well or poorly?

Executive Dashboard
→ What should the Commissioner do?
```

---

# 69. COMMISSIONER'S IDEAL DAILY EXPERIENCE

A future ideal flow is:

### Login

Commissioner sees:

```text
Today's operational briefing
```

### Dashboard

```text
Attendance
Inspections
Open Actions
Performance
Ward Ranking
Alerts
```

### Drill down

Commissioner clicks an alert:

```text
Zone
→ Ward
→ Supervisor
→ Failed inspection
→ photos
→ QC remark
→ suggested action
→ Action Officer status
```

This is the level of integration MatrixTrack should aim for.

---

# 70. QUESTIONS EVERY MATRIXTRACK SCREEN SHOULD ANSWER

Before designing a page, ask:

### Operational page

```text
What work needs to happen?
Who owns it?
What is its status?
```

### QC page

```text
What needs verification?
What evidence supports the decision?
```

### ULB page

```text
What requires intervention?
```

### AO page

```text
What must I resolve?
```

### Commissioner dashboard

```text
Where is the city underperforming?
What should I act on?
```

### Ward Ranking

```text
Who is performing well or poorly, and why?
```

### Attendance

```text
Was the required workforce actually available?
```

---

# 71. IMPORTANT TERMINOLOGY

Use MatrixTrack terminology consistently.

```text
Supervisor / Daroga
Employee / Road Sweeper
QC / Quality Controller / Health Officer
Action Officer / AO / IEC Member
ULB Officer
Commissioner
Beat
Ward
Zone
Inspection
QC Remark
Approved
Rejected
Action Required
Action Taken
Ward Ranking
Attendance Analytics
Inspection & Performance
```

Do not casually rename domain terminology in code/UI because backend enums and user training may rely on it.

---

# 72. CURRENT PRODUCT DIRECTION

MatrixTrack 2.0 is evolving from:

```text
Field inspection application
```

into:

```text
Integrated municipal cleanliness command and performance platform
```

The next-generation experience should connect:

```text
Attendance
+
Field execution
+
Asset inspection
+
Quality control
+
Corrective action
+
Supervisor performance
+
Ward Ranking
+
AI intelligence
+
Executive governance
```

into one coherent system.

---

# 73. INSTRUCTIONS FOR ANY AI WORKING ON MATRIXTRACK 2.0

Before giving an answer about MatrixTrack 2.0, assume the following rules:

1. **Do not simplify the project into a generic cleanliness app.**
2. Understand its full role hierarchy.
3. Understand QC → ULB → AO separation.
4. Treat Attendance as management intelligence.
5. Treat Inspection & Performance as an operational-performance layer, not merely reports.
6. Treat Ward Ranking as a backend-driven comparative performance system.
7. Preserve city/zone/ward/beat hierarchy.
8. Preserve module-specific behavior.
9. Preserve existing authentication.
10. Preserve existing API contracts.
11. Preserve database relationships.
12. Preserve role and module permissions.
13. Do not invent backend fields.
14. Do not invent scoring rules.
15. Do not invent Processing Plant requirements.
16. Use the latest shared code as source of truth.
17. Make surgical changes rather than unnecessary rewrites.
18. Verify TypeScript/build errors after modifications.
19. Design ULB/Commissioner UI as executive software.
20. Ensure every high-level metric can eventually drill into evidence.
21. AI suggestions must remain explainable and human-reviewed.
22. Do not alter unrelated functionality while fixing another module.

---

# 74. SHORT VERSION FOR AI SYSTEM PROMPT

If context size is limited, use this condensed version:

> MatrixTrack 2.0 is an integrated municipal cleanliness operations and governance platform currently piloted for Ujjain. It combines employee attendance, field inspection of Sweeping Beats, Toilets and Litter Bins, photographic evidence, QC verification, ULB corrective-action decisions, Action Officer resolution, supervisor/employee performance, Ward Ranking, auditability, and executive dashboards.
>
> The main hierarchy is City → Zone → Ward → Area/Beat/Asset → Supervisor → Employee. Key roles are HMS_SUPER_ADMIN, CITY_ADMIN, COMMISSIONER, ULB_OFFICER, QC, ACTION_OFFICER, SUPERVISOR and EMPLOYEE.
>
> Supervisor field submissions flow to QC. QC only Approves or Rejects and may provide QC remarks. ULB Officers review QC-processed records and can designate them Action Required. Action Officers then perform corrective action and close them as Action Taken. Do not merge QC, ULB and AO responsibilities.
>
> Inspection & Performance provides date/module filtering, KPIs such as submitted, approved, rejected, Action Required and Action Taken, and drill-down across modules. Attendance Analytics monitors workforce turnout, calendar compliance, zone/ward performance, punch-out and GPS compliance. Ward Ranking combines backend-calculated operational metrics to rank wards and provide role-specific score explanations. The backend is the source of truth for scoring.
>
> The Commissioner/ULB experience should act like a municipal command centre: executive summary, alerts, workforce status, inspections, supervisor performance, Ward Ranking, Action Required and AI-assisted insights. The user prefers premium, professional, enterprise/government-grade UI rather than basic admin dashboards.
>
> Web is Next.js/React. Mobile is React Native + Expo. Backend uses Node/TypeScript, Prisma and PostgreSQL. Preserve all existing authentication/session flows, APIs, role/module/city scoping, Prisma schema/data, navigation, Ward Ranking logic and unrelated functionality. Always use the latest supplied code as source of truth. Make narrow changes and do not rewrite working functionality unnecessarily.
>
> Processing Plant requirements are currently not present in the verified MatrixTrack context, so do not invent plant modules, KPIs or workflows until specifications are supplied.

---

# 75. ONE-SENTENCE PRODUCT DEFINITION

**MatrixTrack 2.0 is a municipal cleanliness command platform that connects workforce attendance, field execution, digital inspection evidence, quality verification, corrective-action management, performance measurement and ward-level governance into one accountable operational system.**

---

# 76. CORE PRODUCT MANTRA

The MatrixTrack 2.0 product journey can ultimately be summarized as:

**Inspect → Verify → Track → Resolve → Measure → Improve.**

Or, from the management perspective:

**People → Places → Performance → Problems → Action → Accountability.**

**Written by Vani Sharma**