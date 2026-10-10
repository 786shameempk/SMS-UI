# 11 — Module Completeness Matrix

Basis: the 39 folders in `src/features`, mapped to the owning backend by folder/service naming (mapping inferred, not verified per endpoint). "Present" means code and tests exist; it is **not** an end-to-end functional pass. Authorization column: "Branch" = entitlement filter exists only on `feature/module-entitlement` (SS-003). Tests: service-level unit suites pass (file 10); per-module coverage not measured.

Status legend: **Structural – OK** (frontend + backend + tests present, no defect found), **Needs E2E** (not exercised end to end), **Gap** (specific finding).

| Module | Frontend | Backend API | Database | Authorization | Tests | Status |
|---|---|---|---|---|---|---|
| academics | Present | Academic | Present | Policies | Suite passes | Structural – OK |
| students | Present | Academic | Present | Policies + family scoping (probed) | Suite passes | Gap: unpaged list (SS-011) |
| attendance | Present | Academic | Present | Policies | Suite passes | Gap: concurrency (SS-012) |
| homework | Present | Academic | Present | Policies; family probe negative | Suite passes | Structural – OK (SS-019) |
| examinations | Present | Academic | Present | Policies | Suite passes | Needs E2E |
| online-exams | Present | Academic | Present | Policies | Suite passes | Needs E2E |
| timetable | Present | Academic | Present | Policies | Suite passes | Needs E2E |
| teachers | Present | Academic | Present | Policies | Suite passes | Needs E2E |
| study-materials | Present | Academic | Present | Policies | Suite passes | Needs E2E (file storage unverified) |
| certificates | Present | Academic | Present | Policies | Suite passes | Needs E2E |
| fees | Present | Finance | Present | Branch | Suite passes | Gap: concurrency/idempotency (SS-012), SS-003 |
| accounting | Present | Finance | Present | Branch | Suite passes | Gap: SS-003 |
| payroll | Present | Finance | Present | Branch | Suite passes | Gap: SS-003 |
| transport | Present | Campus | Present | Branch | Suite passes | Gap: SS-003 |
| hostel | Present | Campus | Present | Branch | Suite passes | Gap: SS-003 |
| library | Present | Campus | Present | Branch | Suite passes | Gap: SS-003 |
| inventory | Present | Campus | Present | Branch | Suite passes | Gap: SS-003 |
| visitors | Present | Campus | Present | Branch | Suite passes | Gap: SS-003 |
| health | Present | Campus | Present | Branch | Suite passes | Gap: SS-003 |
| helpdesk | Present | Not confirmed | Not confirmed | Not confirmed | UI tests | Needs verification |
| communication | Present | Engagement | Present | Branch | Suite passes | Gap: SS-003 |
| notifications | Present | Engagement | Present | Branch | Suite passes | Gap: SS-003 |
| surveys | Present | Engagement | Present | Branch | Suite passes | Gap: SS-003 |
| talents | Present | Engagement | Present | Branch | Suite passes | Gap: SS-003 |
| calendar | Present | Not confirmed | Not confirmed | Not confirmed | UI tests | Needs verification |
| meetings | Present | Meeting | Present | Policies | Suite passes | Needs E2E (LiveKit failure untested) |
| ai | Present | Ai | Present | Tool audiences | Suite passes | Needs AI security pass |
| help | Present | Ai (guide) | Static docs | Role-aware filter | UI + Ai tests | Structural – OK |
| authentication | Present | Auth | Present | – | Suite passes | Gap: SS-004 |
| platform | Present | Auth | Present | superAdmin | Suite passes | Gap: SS-010 |
| tenant | Present | Auth | Present | Policies | Suite passes | Needs E2E |
| administration | Present | Auth | Present | Policies | Suite passes | Needs E2E |
| settings | Present | Auth/various | Present | Policies | Suite passes | Needs E2E |
| dashboard | Present | Multiple | Present | Role-based | UI tests | Gap: mock default (SS-002) |
| azure-dashboard | Present | Not confirmed | Not confirmed | superAdmin (assumed) | UI tests | Needs verification |
| parent-portal | Present | Academic/Finance/Campus | Present | FamilyAllowed + scoping | Suite passes | Structural – OK (probed) |
| reports | Present | Meeting/Academic/Finance | Present | Not confirmed | Partial | Needs verification |
| staff | Present | Auth/Academic | Present | Policies | Suite passes | Needs E2E |
| marketing | Present | Auth (leads) | Present | Anonymous + rate limit | Suite passes | Structural – OK |

Totals: 39 modules; 0 fully verified end to end; 8 need dependency/verification before status can be assigned (helpdesk, calendar, azure-dashboard, reports, plus AI/file-storage items).
