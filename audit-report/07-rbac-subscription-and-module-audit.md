# 07 — RBAC, Subscription and Module Audit

## Model
- Plan: `SubscriptionPlan.IncludedModules` (matrix names) normalised by `PermissionMatrix.NormalizePlanModules`; tenant references its plan live.
- Role: `RoleMatrixPermissions` menu grants; effective claims = plan ∩ role, issued as `module.*` plus AI.* and staff action claims by `EffectivePermissions.ApplyAsync`.
- Enforcement per service: Academic `Policies`; Campus `RequiresModule`/`RequiresPermission`/`FamilyAllowed` + `ModuleAccessFilter`; Finance `FinanceAccessFilter`; Engagement policies + `ModuleAccessFilter`; Ai tool audiences. UI: `RouteGate`.
- Tenant status: Trial / Active / Suspended / Cancelled. **No expiry date** (SS-010).

## Findings
- **SS-003 (High):** the entitlement chain (Campus, Finance, Engagement filters; `RolePermissionGuard`; plan-grouped matrix) exists only on `feature/module-entitlement` branches. Default branches and the running containers lack it, so direct API calls to non-entitled modules can succeed there.
- **SS-010:** plan lapse is manual.
- UI gating alone is not a control; verification is that every module endpoint returns 403 when the claim is missing.
- Parents may call only `[FamilyAllowed]` endpoints in Campus; probes in file 06 show family scoping on students/fees/homework in Academic/Finance.

## Verification to run after merge
1. Create tenant on a plan excluding Transport; call Campus transport endpoints with a valid admin token → expect 403.
2. Remove a module grant from a role in the matrix; re-login; call its endpoints → expect 403.
3. Parent/student tokens against staff-only endpoints → 403 (not 200/empty).
4. Compare route registry `module` values with `PermissionMatrix` names (no unmatched names).
