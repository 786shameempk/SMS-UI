# AI Roadmap — Phase 1 plan for EduCore (SMS UI)

## Where we are (updated 2026-10-02)
- AiService (`E:\Personal\AiService`, port 5142) is built: chat + tools, 5 generators, RAG documents + study assistant, quotas, usage log. Its README phase table is stale (Phase 3 RAG is done).
- UI (route `/ai`, permission `aiFeatures`): Ask School AI, Teacher Tools generators, **Study Assistant** (all roles) and **Study Materials** (staff: upload, live indexing status, delete) call AiService. Insights / At-Risk / Content Assistant are still rule-based.
- Real endpoints differ from the table below: RAG is `/api/ai/documents` + `/api/ai/study-assistant` (a separate upload, not indexing of study-materials ids); there is no `/capabilities` and no server-side paper drafts.
- Services: Auth, Academic(5136), Finance(5137), Campus(5139), Engagement(5140), Meeting(5141). All clients come from `createServiceHttpClient` in `src/lib/httpClient.ts` (bearer + `X-Tenant-Id`/`X-Branch-Id`, 401 refresh).
- Conventions: `src/features/<module>/{api.ts,types.ts,constants.ts,components,pages}`, React Query, RHF+zod, shadcn-style `components/ui`, `@/` alias, colocated tests.

## Design principles (from the roadmap)
1. The AI service calls **existing APIs as tools** with the caller's token — never raw SQL. Role scoping (parent → own children only) is enforced by the downstream services, not by the prompt.
2. **AI proposes, a human approves** for anything published or sent (papers, notices, report comments).
3. Generated artifacts are **drafts** with explicit states: `Draft → Reviewed → Approved → Published`.
4. Analytics via predefined, authorized reporting endpoints only.

## New backend: AiService (port 5142)
Not in this repo. The UI needs this contract; until it exists the UI uses a mock adapter (`VITE_AI_MOCK=true`).

| Endpoint | Purpose |
|---|---|
| `POST /api/ai/chat` | `{conversationId?, message, studentId?}` → `{conversationId, reply, citations[], toolsUsed[]}` (SSE streaming later) |
| `POST /api/ai/question-papers/generate` | blueprint → draft paper (sections, questions, answer key) |
| `PUT/POST /api/ai/question-papers/{id}` , `/approve`, `/publish` | edit, approve, publish into online-exams question bank |
| `POST /api/ai/worksheets/generate` | topic, class, difficulty, count, types → worksheet |
| `POST /api/ai/materials/{materialId}/index` | extract, chunk, embed (RAG) |
| `POST /api/ai/materials/{materialId}/ask` | grounded Q&A, summary, quiz, flashcards, with citations |

AiService internals: tool registry wrapping Academic/Finance/Campus/Engagement APIs, vector store (pgvector), provider abstraction, per-tenant usage limits and audit log (who asked what, which tools ran).

### LLM provider abstraction
AiService will run on exactly one of: `OpenAIProvider`, `AzureOpenAIProvider`, `AnthropicProvider`, `LocalLLMProvider`, chosen by config per deployment. Consequences:
- **The UI is provider-agnostic.** It only talks to the AiService contract above; no provider names, model IDs or keys ever reach the browser.
- AiService defines one `ILlmProvider` interface (chat, structured/JSON output, tool calling, embeddings, streaming) and adapts each provider to it. Capabilities differ (a local model may lack reliable tool calling or embeddings), so expose `GET /api/ai/capabilities` and let the UI hide features the active provider cannot support.
- Question/paper generation must use schema-validated JSON output and a server-side retry on malformed output, since quality varies by provider.
- Data residency: Azure OpenAI or a local model suit tenants that cannot send student data to a third party; record the active provider in the audit log.

## Phase 1 features → repo mapping

### 1. AI School Assistant (build first)
- UI: `features/ai/components/AssistantTab.tsx` (+ floating "Ask School AI" launcher in the shell later). Parents see a ChildSwitcher-scoped assistant (`parent-portal`).
- Tools the backend exposes: timetable (Academic), attendance (Campus/Academic), fees/invoices (Finance), exam schedule + results (examinations), notices (Engagement), homework.
- Gating: `modulePermissions.aiFeatures`; add `audience` so students/parents get it without staff pages.
- Open question: answer only from tool results; show "Based on: Fees, Attendance" chips so users can see the source.

### 2. Question Generator + 3. Question Paper Generator
- UI: new `features/ai/components/PaperGeneratorTab.tsx` — wizard: class/subject/chapter → blueprint (marks, difficulty %, type mix, sections) → generated draft → inline edit/regenerate per question → Approve → Publish.
- Publish target: `online-exams` question bank / exam wizard (`features/online-exams`), so approved questions are reusable.
- Entry points: also from Question Bank page ("Generate with AI").

### 4. Worksheet Generator
- Shares the generation + review components with the paper generator; adds print/PDF and "assign to class" (homework module).

### 5. Study Material Q&A (RAG)
- Hook into `features/study-materials` `MaterialDetailDialog`: "Ask AI about this material" tab (Q&A, summary, quiz, flashcards).
- Index on upload (`MaterialFormDialog` success → `index` call); show index status badge.
- Learners only get materials already visible to them; the backend must apply the same visibility rules.

## Shared frontend work
- `AI_API_BASE_URL` + `aiHttpClient` in `httpClient.ts`; `aiApiUrl` in `public/config.js`, `docker/40-educore-config.sh`, `.env.example`.
- `features/ai/` split: keep rule-based insights as-is; add `assistant/`, `papers/`, `materials/` sub-areas rather than growing `api.ts`.
- Reusable `DraftReviewPanel` (status badge, edit, approve) used by papers, worksheets, later notices/report comments.
- Mock adapter behind `VITE_AI_MOCK` so UI work isn't blocked on the backend.
- Tests: contract/mapper tests per `api.ts`; component tests for the review flow.

## Suggested order
1. AI client plumbing + mock adapter + School Assistant UI (done, parent child selector included)
2. Paper generator wizard + review panel + publish to question bank (done; publishes via the existing `/api/question-bank/import`, tagged `ai-generated`)
3. Worksheet generator (done: generate, print, assign as homework)
4. Study material RAG panel (done: Study Assistant + Study Materials tabs; not yet linked from the study-materials dialogs)
5. Phase 2 (performance analysis, exam analysis) extends the existing rule-based insights with LLM narration over the same data.

## Next up
- Access (done 2026-10-02): AuthService gives AI Features to principal/teacher/parent/student (`TenantDefaults.DefaultMatrix`, seeded role claims; migration `20261002190000_GrantAiFeaturesToTeachersParentsStudents` for existing schools), and `/ai` is wrapped in `RequireModule`. Plans still gate it (not in Starter). `AI.*` permissions are optional overrides; AiService's role audiences already cover the defaults.
- Done 2026-10-02: homework/worksheet drafts → "Assign as homework" (prefilled `HomeworkFormDialog`, saved as Draft, answers never included); "Generate with AI" on the Question Bank page (`GenerateQuestionsDialog`, prefilled from filters).
- Lesson plans still print-only (no lesson-plan module to save into).
- Done 2026-10-02: report card remarks. `POST /api/ai/report-card-remark {examId, studentId, observations?, tone, length}`; AiService reads `class-results` (+ transcript for trend) with the teacher's token, sends no name/admission number to the model (`[STUDENT]` placeholder), returns a Draft. UI: "Draft with AI" under Remarks in Examinations → Report Cards; the teacher must "Use this remark" then Save.
- Done 2026-10-02: whole-class remarks. `POST /api/ai/report-card-remarks/batch` (≤10 students, one model call each, per-student errors, stops on quota). UI: "Draft remarks with AI" in Examinations → Results & Ranking; sends chunks of 5 with progress, skips students who already have a remark unless included, saves only ticked drafts.
- Done 2026-10-02: exam insights for online exams. AcademicService `GET /api/online-exams/{id}/analysis` now also returns each question's bank `topic`/`difficulty`; AiService `POST /api/ai/exam-insights {examId}` computes topic averages + weakest questions itself, the model explains them (cited question numbers validated). UI: "AI insights" card on Online Exams → Reports.
- Done 2026-10-02: conversation history in Ask School AI (History / New chat; `GET /api/ai/conversations?feature=chat`, new `DELETE /api/ai/conversations/{id}`).
- Done 2026-10-02: AI Usage tab (admin/principal) — totals, monthly token allowance (`limits` added to `GET /api/ai/usage`), requests per day, by feature, top users (names from AuthService `school-users`).
- Done 2026-10-02: student progress summary. `POST /api/ai/student-performance {studentId}`: transcript + subject trends over the last 3 exams + 90-day attendance, computed by AiService; UI card on Examinations → Transcript.
- Backend still to expose: notification generator, translation (prompts + engine exist; controllers do not).
- Conversation history (`GET /api/ai/conversations`) and an admin usage view (`GET /api/ai/usage`).

## Risks
- Student data going to a third-party LLM: needs tenant consent, a data-minimization policy, and a no-training provider agreement.
- Hallucinated fee/attendance numbers: answers must come from tool output; show sources.
- Cost: per-tenant quotas, caching, and rate limits in AiService.
