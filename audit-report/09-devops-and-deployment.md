# 09 — DevOps and Deployment

## Reviewed
`docker-compose.yml` (dev), `deploy/live/docker-compose.yml`, `deploy/live/Caddyfile`, `nginx.conf`, all service Dockerfiles, GitHub Actions workflows. No deployment, build push, restart or DNS change was performed.

## Findings
| Ref | Observation |
|---|---|
| SS-002 | Demo-data / mock-dashboard defaults enabled in production compose |
| SS-006 | `:latest` tags; no healthchecks or resource limits; Redis without auth; one shared SQL login |
| SS-007 | Caddy/nginx lack CSP, frame-ancestors, Referrer-Policy |
| SS-014 | UI `docker-image.yml` may publish without a test gate; no lint, image scan or deploy automation in any pipeline |
| SS-016 | Stale `deploy/azure back up/` copy |
| – | Dev compose exposes service ports and uses the default Azurite dev key and a default SMTP username literal (dev only) |
| – | Dockerfiles run as non-root (`USER $APP_UID`) — positive |
| – | Caddy on-demand TLS is protected by AuthService domain-check — positive |

## Failure-mode questions still open
Startup ordering when SQL/Redis are slow, graceful shutdown for in-flight payments, backup and restore drills for Azure SQL, LiveKit reconnection, SMTP retry/outbox, log retention.

## Recommendations
Pin versions/digests, add healthchecks with `depends_on: service_healthy`, resource limits, Redis auth, per-service SQL users, vulnerability scan (Trivy) and secret scan (gitleaks) in CI, and a documented rollback.
