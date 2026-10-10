# 08 — Mobile, AI and Integrations

## Mobile (`E:\Personal\SMS Mobile`)
- Monorepo with apps `staff`, `student`, `teacher` and packages `api`, `auth`, `live`, `monitoring`, `push`, `ui`.
- Tokens: `packages/auth/src/storage.ts` uses expo-secure-store (Keychain/Keystore, chunked for iOS size limits); web fallback to localStorage is dev-preview only (SS-021).
- Teacher app has an offline attendance module (`apps/teacher/src/lib/offline-attendance.ts`); sync conflict handling and duplicate submission protection were **not** tested.
- Not verified: builds, jest run, push registration, refresh-token flow, API version compatibility with the entitlement changes, store-release config.

## AI (AiService, branch `feature/help-guide`)
- 224 unit tests pass. Rate-limit policy `ai` applied to AI and generation controllers. Tool audiences (`IAiTool`) drive role-aware answers; the SMS UI assistant filters by role and enabled modules.
- Not verified: tenant scoping of embeddings/vector search and indexed documents, prompt-injection handling, provider usage caps and cost control, what tenant data is sent to external providers, indexing sync failure behaviour. **Recommend a dedicated AI security pass.**

## Integrations
- LiveKit + egress (online classes), SMTP/email, WhatsApp lead notifications (AuthService), Azure Blob (Azurite in dev), Redis. Failure behaviour (SMTP down, LiveKit down, Redis down) was not exercised.
