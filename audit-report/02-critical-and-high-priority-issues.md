# 02 — Critical and High Priority Issues

No finding reached **Critical** on the evidence gathered. Full details and fix guidance are in `13-findings-register.md`.

| ID | Title | Why High, not Critical | Becomes Critical if |
|---|---|---|---|
| SS-001 | Secrets committed to git; one JWT secret literal shared across five services | Presence confirmed; production use of the same values not verified | Production signs tokens with the committed secret (anyone with repo access can mint admin/superAdmin tokens for any tenant) |
| SS-002 | Production compose defaults `ALLOW_DEMO_DATA=true`, `DASHBOARD_DATA_SOURCE=mock` | Only applies if env overrides are missing | A live school is seeing mock figures, or demo seeding runs against a production database |
| SS-003 | Entitlement fixes unmerged; default branches and running containers lack them | Requires a valid token; limited to Campus/Finance/Engagement modules | A paying tier boundary (plan) is being relied on commercially while the API is open to non-entitled tenants |

## Immediate actions (in order)
1. Rotate the JWT secret and SA password, then remove `AuthService/.env` from git history (SS-001).
2. Merge and release the `feature/module-entitlement` branches (Auth, Campus, Finance, Engagement) with the UI `feature/help-center` branch, and rebuild images (SS-003).
3. Set `ALLOW_DEMO_DATA=false` and `DASHBOARD_DATA_SOURCE=live` in `deploy/live/docker-compose.yml` and add a startup guard (SS-002).
