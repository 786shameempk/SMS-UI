# 03 — Frontend Audit (SMS UI)

## Structure
- 39 feature folders under `src/features`; a single route registry (`src/app/routeRegistry.ts`) feeds navigation, `canOpenRoute` and `RouteGate`.
- State: zustand `useAuthStore` (persisted to localStorage `sms-auth`), React Query for server state.
- Help/Ask-AI: `virtual:help-catalog` Vite virtual module; docs-as-source pipeline in `scripts/help`.

## Evidence
| Check | Result |
|---|---|
| `npm run typecheck:test` | clean (exit 0) |
| `npx vitest run` | 879 tests passed (131 files, ~97 s) |
| `npm audit --omit=dev` | found 0 vulnerabilities |
| `dangerouslySetInnerHTML` | 1 use: `src/features/marketing/components/FaqSection.tsx` (SS-018) |
| `localStorage` users | auth store, theme, help, AI launcher/recommend, meetings reminder banner, transport tracking tests |

## Findings
- **SS-005** Access and refresh tokens persisted in localStorage.
- **SS-018** Single raw-HTML render; confirm content is static.
- **Route gating is UX only.** `RouteGate`/`canOpenRoute` hide modules by plan and role, but API enforcement is the real control (see SS-003).
- **Dashboard data source:** `ALLOW_DEMO_DATA` / `DASHBOARD_DATA_SOURCE` allow mock data; the UI is safe only if the deployment flips them (SS-002).
- Test run cost: jsdom environment created 131 times (≈281 s tracked); consider `pool: 'vmThreads'` if CI time matters (Informational).

## Not verified
Lint run, production `npm run build` bundle size, accessibility audit, Vite env exposure review (`VITE_*` variables), service-worker behaviour.
