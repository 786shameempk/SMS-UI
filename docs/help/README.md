# School Sphere Help Center: authoring and publishing

One set of Markdown articles feeds four things: the online Help Center (`/help`, also reachable as `/guide`), the PDF manual, the Ask School AI guide index, and the coverage reports. Nothing is copied by hand between them.

## Where things are

| Path | What it is |
|---|---|
| `docs/help/modules/<module>/*.md` | The articles. One folder per module in `src/app/routeRegistry.ts`. |
| `docs/help/manual.json` | PDF manual version, subtitle and revision history. |
| `docs/help/assets/screenshots.json`, `videos.json` | Manifests of real captures. An image or video is only usable once it is listed here. |
| `docs/help/_inventory/` | Generated list of routes, menu entries and feature folders (`npm run help:inventory`). |
| `docs/help/_reports/` | Generated coverage and traceability reports (`npm run help:check`). |
| `src/app/routeRegistry.ts` | The one list of modules and screens. A new screen must be added here (a test fails otherwise). |

## Writing an article

Start from a similar article. Front matter fields: `id`, `title`, `module`, `kind` (overview, task, reference, faq, troubleshooting), `access` (public, member, admin, platform), `roles`, `route` (a registry route id), `summary`, `order`, `status`, `related`, `tasks` and `keywords`.

- Take every label, button name, menu path and validation message from the running screen or its source. Do not guess.
- Use only the supported Markdown: headings, paragraphs, numbered steps, bullet lists, tables, `> **Note:**` callouts (Note, Tip, Warning, Important), images `![alt](shot:id "caption")`, links `[text](help:article-id)` and `[text](route:route.id)`.
- `tasks` give Ask School AI the words people use for a job and the screen it happens on. A task's `route` must be a screen that opens without choosing a record first.
- Never put real people, real credentials or real school data in an article or screenshot.
- **Status:** `draft` is unfinished. `reviewed` means it was checked against the code. `verified` means someone followed it in the running app; set `verifiedOn` to that date. Do not mark an article `verified` unless that happened.

## Commands

```bash
npm run help:check        # coverage, traceability, broken links, drift (add -- --strict for a release gate)
npm run help:pdf          # build the public manual into public/help (commit the result)
npm run help:pdf:check    # fails when the committed PDF is older than the articles
npm run help:index        # write dist-docs/help-index.json for Ask School AI
```

`help:pdf` needs Microsoft Edge or Chrome installed. The `admin` and `platform` editions are built into `dist-docs/` and are handed out by hand, never committed or served publicly.

## Publishing the guide to Ask School AI

1. `npm run help:index` writes `dist-docs/help-index.json`.
2. Either send it with a platform administrator's token: `HELP_PUBLISH_TOKEN=... node scripts/help/ai-index.mjs --publish https://<ai-service-host>`, or ship the file with the AI service and set `Ai:Help:IndexPath` to its location.
3. `GET /api/ai/help/index` (administrators) shows the revision and size that are loaded.

Only the platform administrator can publish; the service rejects the whole index if any part is invalid. Reading is filtered per person by access class and module permission on the server.

## Ask School AI and navigation

Answers that match a documented task come from the guide directly, with no model call. Other how-to questions use the `search_help` tool. The model never supplies an address: it can only offer a registered screen id, and the web app resolves the address from its own route table and re-checks the reader's access before showing an **Open** button. The AI never creates, changes or deletes school records through the guide.

## Release checklist

1. `npm run help:inventory` and `npm run help:check`; read the drift and stale lists.
2. Update or add articles for every screen that changed.
3. `npm run help:pdf`, then commit the PDF with the articles.
4. `npm run help:index` and publish the index.
5. Sign in as a few different roles and open `/help` and `/guide`: check search, the role pages and an **Open this screen** link.

## Screenshots

`npm run help:screenshots` captures images of the running app and lists them in `docs/help/assets/screenshots.json`.

1. Start the app (`npm run dev -- --host 127.0.0.1 --port 5173`).
2. Add an entry to `docs/help/assets/screenshot-plan.json`: an `id`, a `route` (a screen from the registry that opens without choosing a record), a `role`, a `viewport` (desktop, tablet or mobile) and `alt` text.
3. If the screen needs data, add a fixture file under `docs/help/assets/fixtures/` and name it in the entry's `fixtures`. A fixture is a JSON array of `{ "match": "api/students", "body": ... }` replies.
4. Run the script, then **look at every image** before committing.

The script never contacts a real service: every API call is answered from your fixtures (or an empty reply), and the signed-in user is invented. That is what keeps real data out of the images. Use the image in an article with `![alt text](shot:the-id "Caption")`; put it between steps lists, not inside one, so the numbering is not split.

Eleven screens are captured so far. Most are empty screens; the student list, its actions menu and the transfer dialog use the synthetic fixture in `assets/fixtures/students.json`. A screen that fills from a list shows a loading skeleton against an empty reply, so it needs a fixture like that one.

## Videos

See `docs/help/VIDEOS.md`.

## Guided walkthroughs

Some task articles have a **Walk me through it** button. It opens the real screen and shows a small card with Back / Next, with a ring around the control each step names. It never clicks, types or submits for the person.

- Tours are defined in `src/features/help/walkthroughs.ts`: an article id, a starting screen (a registry route id that opens directly) and steps. A step finds its control by the words on screen (a button's name, a form label, a tab), never by CSS, and shows its `ifMissing` hint when the control is not on screen yet (for example, the form has not been opened).
- Every step's wording must agree with its article. A test checks that each tour points at a real article and a real screen.
- Three tours exist: register a student, add a user and mark attendance. They were run against the real screens with a synthetic session and every step found its control, on desktop and phone widths.
- Limitation: while a form drawer is open, the page behind it is hidden from screen readers by the drawer itself, so the walkthrough card is not reachable by keyboard or screen reader at that point. The article text carries the same steps.

## Label audit against the running app

`npm run help:audit` signs in to a **demo** environment, opens each article's screen, reads every tab, opens each "New / Add / Register / Schedule …" dialog (never filling or submitting anything) and lists the bold labels an article names that it could not find on screen.

```bash
HELP_AUDIT_LOGINS='[{"email":"…","password":"…","roles":["admin","principal"]}]' npm run help:audit -- --auth http://localhost:5118/
```

Credentials come only from that environment variable. Details go to `dist-docs/label-audit.json`. A missing label is a prompt to look: it may belong to a state the audit does not reach (a row action that needs data, a toast message, a field that appears only after a choice). It checks labels, **not** that the steps work, so it never sets an article to `verified`.

## Who is offered what (Ask School AI)

Ask School AI answers by the signed-in person's **role** and the **modules switched on** for them, in both the web app and the AI service:

- **Module off** (the school's plan or role does not include it): the person is told the module is not available to their account, and gets no steps, menu path or button.
- **Parents and students** are only offered what an article lists for their own role in `roles:`. Ask "how do I mark attendance?" as a parent and the reply is a plain explanation ("You are signed in as a parent, so you can't mark attendance for a class. That is done by school administrators, principals and teachers…") with no steps, no related guides and no **Open** button. Staff roles, including custom school roles, are decided by the module being on.
- So every article that describes a staff action in a module that families can also open (attendance, homework, exams, timetable, study materials, online classes, notifications, talents) must say `roles:` explicitly, and an article should not mix a family task with a staff task: split it in two. The coverage check lists roles that are not default roles of the module.
- After changing `roles:`, republish the guide to the AI service (the index carries each task's roles).
