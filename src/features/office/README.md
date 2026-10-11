# Office portal (`/adminLogin`, `/office/*`)

The School Sphere team's console for onboarding schools and managing what they have bought. It has its own sign-in, token,
HTTP client and store, and shares nothing with the school app's session.

* Routes: `src/app/officeRoutes.tsx` (spread into `router.tsx`). Menu entries come from `navigation.ts` and appear only when
  the screen exists in `pages/registry.ts` and the user holds its permission. Hiding is a convenience; the API enforces every
  permission.
* API clients: `api/*.ts`, types in `types.ts`, `salesTypes.ts`, `opsTypes.ts`. The access token lives in memory only; the
  refresh token is an HttpOnly cookie.
* Money is never computed here. Quotation prices come from the server (`pricing/preview`), and screens only show what the
  server returns.
* Tests: `office.test.tsx`, `plans.test.tsx`, `sales.test.tsx`, `ops.test.tsx`.

Backend, configuration, rules, API reference and limitations: `AuthService/docs/OFFICE_PORTAL.md`.
