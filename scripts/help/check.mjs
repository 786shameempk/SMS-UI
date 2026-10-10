// Documentation coverage and regression checks.
//   npm run help:check            writes docs/help/_reports/*, prints a summary, fails on broken references
//   npm run help:check -- --strict also fails when anything is undocumented or unverified (for release gates)
//
// Coverage is computed from the application itself (route registry, menu, labels the screens render), never from a list of
// modules assumed in advance. The "actions" figure is a heuristic: an action counts as documented when its label appears in an
// article of the module it belongs to. It finds gaps; it does not prove an article is correct. Only `verified` articles, checked
// in the running app, count as verified.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { buildCatalog, docsDir, loadRegistry, root } from "./lib/catalog.mjs";
import { buildInventory } from "./inventory.mjs";

const strict = process.argv.includes("--strict");
const outDir = join(docsDir, "_reports");

/** Which modules a feature folder's screens belong to; a label found in any of them counts. */
const FEATURE_MODULES = {
  academics: ["academic-setup"],
  accounting: ["accounting"],
  administration: ["users", "roles", "branches"],
  ai: ["ai-features"],
  attendance: ["attendance"],
  authentication: ["account"],
  "azure-dashboard": ["azure"],
  calendar: ["calendar"],
  certificates: ["certificates"],
  communication: ["communication"],
  dashboard: ["dashboard"],
  examinations: ["examinations"],
  fees: ["fees"],
  health: ["health"],
  helpdesk: ["helpdesk"],
  homework: ["homework"],
  hostel: ["hostel"],
  inventory: ["inventory"],
  library: ["library"],
  meetings: ["online-classes"],
  notifications: ["notifications"],
  "online-exams": ["online-exams"],
  "parent-portal": ["parent-portal"],
  payroll: ["payroll"],
  platform: ["platform-console"],
  reports: ["reports"],
  settings: ["settings"],
  staff: ["staff"],
  students: ["students"],
  "study-materials": ["study-materials"],
  surveys: ["surveys"],
  talents: ["talent-showcase"],
  teachers: ["teachers"],
  timetable: ["timetable"],
  transport: ["transport"],
  visitors: ["visitors"],
};
/** Feature folders with no end-user screens of their own. */
const NON_FEATURES = new Set(["marketing", "tenant", "help"]);

const norm = (s) => s.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, " ").trim();
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

const registry = await loadRegistry();
const { catalog, problems } = await buildCatalog();
const inventory = buildInventory();
const exclusions = readJson(join(docsDir, "_exclusions.json"), []);
const excluded = (kind, id) => exclusions.find((e) => e.kind === kind && e.id === id);

const errors = problems.filter((p) => p.severity === "error");
const warnings = problems.filter((p) => p.severity === "warning");

// ── Modules ─────────────────────────────────────────────────────────────────
const moduleRows = registry.MODULES.map((m) => {
  const arts = catalog.articles.filter((a) => a.module === m.id);
  return { id: m.id, title: m.title, articles: arts.length, overview: arts.some((a) => a.kind === "overview"), tasks: arts.filter((a) => a.kind === "task").length, status: Object.fromEntries(["draft", "reviewed", "verified"].map((s) => [s, arts.filter((a) => a.status === s).length])) };
});
const modulesWithoutArticles = moduleRows.filter((m) => m.articles === 0 && !excluded("module", m.id));
const modulesWithoutOverview = moduleRows.filter((m) => m.articles > 0 && !m.overview && !excluded("module", m.id));

// ── Routes ──────────────────────────────────────────────────────────────────
const documentedRoutes = new Set();
for (const a of catalog.articles) {
  if (a.route) documentedRoutes.add(a.route);
  for (const r of a.routeLinks) documentedRoutes.add(r);
  for (const t of a.tasks) if (t.route) documentedRoutes.add(t.route);
}
const routeRows = registry.ROUTES.map((r) => ({ ...r, documented: documentedRoutes.has(r.id), excluded: excluded("route", r.id) ?? null }));
const routesUndocumented = routeRows.filter((r) => !r.documented && !r.excluded);

// ── Actions (labels the screens render) ─────────────────────────────────────
const moduleText = new Map();
for (const a of catalog.articles) moduleText.set(a.module, (moduleText.get(a.module) ?? "") + "\n" + norm(`${a.title} ${a.text}`));
const ACTION_KINDS = [["tabs", "tab"], ["dialogs", "dialog"], ["confirms", "confirmation"], ["menuActions", "row action"]];
const generic = new Set(["cancel", "save", "close", "back", "edit", "delete", "view", "print", "submit", "confirm", "ok", "yes", "no", "apply", "add", "remove", "update", "next", "previous", "search", "reset"]);
const actionRows = [];
for (const [feature, f] of Object.entries(inventory.features)) {
  if (NON_FEATURES.has(feature)) continue;
  const modules = FEATURE_MODULES[feature];
  if (!modules) {
    actionRows.push({ feature, kind: "feature", label: feature, module: null, documented: false, note: "feature folder is not mapped to a module in scripts/help/check.mjs" });
    continue;
  }
  for (const [key, kind] of ACTION_KINDS) {
    for (const label of f.facts[key] ?? []) {
      const n = norm(label);
      if (n.length < 3 || generic.has(n) || /^\d/.test(n)) continue;
      const documented = modules.some((m) => (moduleText.get(m) ?? "").includes(n));
      actionRows.push({ feature, kind, label, module: modules[0], documented, excluded: excluded("action", `${feature}:${label}`) ? true : false });
    }
  }
}
const actionsOpen = actionRows.filter((a) => !a.documented && !a.excluded);

// ── Articles: status, assets, metadata ──────────────────────────────────────
const byStatus = Object.fromEntries(["draft", "reviewed", "verified"].map((s) => [s, catalog.articles.filter((a) => a.status === s).length]));
const shotIds = new Set(catalog.screenshots.map((s) => s.id));
const imageRefs = catalog.articles.flatMap((a) => a.blocks.filter((b) => b.type === "image").map((b) => ({ article: a.id, shot: b.shot, present: shotIds.has(b.shot) })));
const missingShots = imageRefs.filter((r) => !r.present);
const articlesWithoutShots = catalog.articles.filter((a) => a.kind === "task" && a.screenshots.length === 0 && !a.blocks.some((b) => b.type === "image"));
const articlesWithoutVideo = catalog.articles.filter((a) => a.kind === "task" && !a.video);
const staleDays = 180;
const stale = catalog.articles.filter((a) => a.verifiedOn && Date.now() - new Date(a.verifiedOn).getTime() > staleDays * 86_400_000);
const metadataIssues = [];
for (const a of catalog.articles) {
  const m = registry.getModule(a.module);
  if (!m) continue;
  const extra = a.roles.filter((r) => !m.defaultRoles.includes(r));
  if (extra.length) metadataIssues.push({ article: a.id, issue: `roles ${extra.join(", ")} are not default roles of module ${m.id}` });
  const rank = { public: 0, member: 1, admin: 2, platform: 3 };
  if (rank[a.access] < rank[m.access]) metadataIssues.push({ article: a.id, issue: `access "${a.access}" is more open than module ${m.id} ("${m.access}")` });
  if (a.status === "verified" && !a.verifiedOn) metadataIssues.push({ article: a.id, issue: "verified without verifiedOn" });
}

// ── Drift between the router, the menu and the registry (also enforced by routeRegistry.test.ts) ──
const routerPaths = new Set(inventory.routes.map((r) => r.path).filter((p) => !p.endsWith("/*")));
const registryPaths = new Set(registry.ROUTES.map((r) => r.path));
const drift = [...[...routerPaths].filter((p) => !registryPaths.has(p)).map((p) => `router has ${p}, registry does not`), ...[...registryPaths].filter((p) => !routerPaths.has(p)).map((p) => `registry has ${p}, router does not`)];

// ── Report ──────────────────────────────────────────────────────────────────
const pct = (n, d) => (d === 0 ? "n/a" : `${Math.round((n / d) * 100)}%`);
const screens = routeRows.filter((r) => !r.excluded);
const actionTotal = actionRows.filter((a) => !a.excluded).length;
const actionDocumented = actionRows.filter((a) => a.documented).length;
const summary = {
  appVersion: catalog.appVersion,
  revision: catalog.revision,
  modules: { total: moduleRows.length, withArticles: moduleRows.length - modulesWithoutArticles.length, withOverview: moduleRows.filter((m) => m.overview).length },
  routes: { total: registry.ROUTES.length, countedScreens: screens.length, documented: screens.filter((r) => r.documented).length, excluded: routeRows.length - screens.length },
  actions: { identified: actionTotal, documented: actionDocumented, heuristic: true },
  articles: { total: catalog.articles.length, ...byStatus, tasks: catalog.tasks.length },
  assets: { screenshotsCaptured: catalog.screenshots.length, screenshotsReferencedButMissing: missingShots.length, videosRecorded: catalog.videos.length, taskArticlesWithoutScreenshot: articlesWithoutShots.length, taskArticlesWithoutVideo: articlesWithoutVideo.length },
  problems: { errors: errors.length, warnings: warnings.length, drift: drift.length, metadata: metadataIssues.length, stale: stale.length },
};

const md = [];
md.push("# Documentation coverage report", "", "_Generated by `scripts/help/check.mjs` (`npm run help:check`). Do not edit by hand._", "");
md.push(`App version ${summary.appVersion}, content revision \`${summary.revision}\`.`, "");
md.push("| Measure | Value |", "|---|---|");
md.push(`| Modules discovered | ${summary.modules.total} (${summary.modules.withArticles} with articles, ${summary.modules.withOverview} with an overview) |`);
md.push(`| Screens (routes) | ${summary.routes.total} (${summary.routes.documented} of ${summary.routes.countedScreens} counted are documented, ${summary.routes.excluded} excluded) |`);
md.push(`| Actions identified in screens (heuristic) | ${summary.actions.identified}, documented ${summary.actions.documented} (${pct(actionDocumented, actionTotal)}) |`);
md.push(`| Articles | ${summary.articles.total}: ${byStatus.verified} verified in the app, ${byStatus.reviewed} checked against the code, ${byStatus.draft} draft |`);
md.push(`| Screenshots | ${summary.assets.screenshotsCaptured} captured; ${summary.assets.screenshotsReferencedButMissing} referenced but not captured; ${summary.assets.taskArticlesWithoutScreenshot} task articles have none |`);
md.push(`| Videos | ${summary.assets.videosRecorded} recorded; ${summary.assets.taskArticlesWithoutVideo} task articles have none |`);
md.push(`| Awaiting manual verification | ${byStatus.draft + byStatus.reviewed} articles |`, "");
md.push("> Coverage is **not** reported as complete: nothing is called verified until it has been checked in the running application, and the action figure only finds labels that no article mentions.", "");

md.push("## Modules", "", "| Module | Articles | Overview | How-to | Draft | Checked | Verified |", "|---|---|---|---|---|---|---|");
for (const m of moduleRows) md.push(`| ${m.title} | ${m.articles} | ${m.overview ? "yes" : "no"} | ${m.tasks} | ${m.status.draft} | ${m.status.reviewed} | ${m.status.verified} |`);

md.push("", "## Screens with no article", "");
if (routesUndocumented.length === 0) md.push("None.");
for (const r of routesUndocumented) md.push(`- \`${r.path}\` (${r.label}, module ${r.moduleId})`);

md.push("", "## Actions no article mentions (heuristic)", "");
const byFeature = new Map();
for (const a of actionsOpen) byFeature.set(a.feature, [...(byFeature.get(a.feature) ?? []), a]);
if (actionsOpen.length === 0) md.push("None.");
for (const [feature, list] of byFeature) md.push(`- **${feature}** (${list.length}): ${list.slice(0, 60).map((a) => `${a.label} _(${a.kind})_`).join(", ")}${list.length > 60 ? " …" : ""}`);

md.push("", "## Problems", "");
if (errors.length + warnings.length + drift.length + metadataIssues.length + stale.length === 0) md.push("None.");
for (const p of errors) md.push(`- **error** ${p.article}: ${p.message}`);
for (const p of warnings) md.push(`- warning ${p.article}: ${p.message}`);
for (const d of drift) md.push(`- **drift** ${d}`);
for (const m of metadataIssues) md.push(`- metadata ${m.article}: ${m.issue}`);
for (const a of stale) md.push(`- stale ${a.id}: verified ${a.verifiedOn}, more than ${staleDays} days ago`);

md.push("", "## Excluded on purpose", "");
if (exclusions.length === 0) md.push("Nothing excluded.");
for (const e of exclusions) md.push(`- ${e.kind} \`${e.id}\`: ${e.reason}`);

// Traceability: Module -> Route -> Screen -> Action (articles' tasks and sections) -> Role -> Article -> Screenshot/Video -> Test.
const trace = ["# Traceability matrix", "", "_Generated by `npm run help:check`. Module → Route → Screen → Action → Role → Article → Screenshot/Video → Test status._", "", "| Module | Route | Screen | Actions covered | Roles | Article | Screenshot | Video | Verification | Tests |", "|---|---|---|---|---|---|---|---|---|---|"];
for (const a of catalog.articles) {
  const route = a.route ? registry.getRoute(a.route) : null;
  const actions = [...a.tasks.map((t) => t.label), ...a.headings.filter((h) => h.level === 2).map((h) => h.text)].slice(0, 6).join("; ");
  const shots = a.blocks.filter((b) => b.type === "image").map((b) => (shotIds.has(b.shot) ? b.shot : `${b.shot} (missing)`));
  trace.push(`| ${a.module} | ${route ? `\`${route.path}\`` : "-"} | ${route?.label ?? "-"} | ${actions || "-"} | ${a.roles.join(", ")} | [${a.id}](../${relative(docsDir, join(root, a.source)).replace(/\\/g, "/")}) | ${shots.join(", ") || "none"} | ${a.video ?? "none"} | ${a.status}${a.verifiedOn ? ` (${a.verifiedOn})` : ""} | ${a.e2e ?? "none"} |`);
}
trace.push("", "## Screens without any article", "", ...(routesUndocumented.length ? routesUndocumented.map((r) => `- ${r.moduleId} \`${r.path}\` ${r.label}`) : ["None."]));

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "COVERAGE.md"), md.join("\n") + "\n");
writeFileSync(join(outDir, "TRACEABILITY.md"), trace.join("\n") + "\n");
writeFileSync(join(outDir, "coverage.json"), JSON.stringify({ summary, modulesWithoutArticles: modulesWithoutArticles.map((m) => m.id), routesUndocumented: routesUndocumented.map((r) => r.id), actionsOpen: actionsOpen.length, drift, metadataIssues, errors, warnings }, null, 2) + "\n");

console.log(`Modules ${summary.modules.withArticles}/${summary.modules.total} with articles · screens ${summary.routes.documented}/${summary.routes.countedScreens} documented · actions ${actionDocumented}/${actionTotal} (${pct(actionDocumented, actionTotal)}, heuristic)`);
console.log(`Articles ${summary.articles.total}: ${byStatus.verified} verified, ${byStatus.reviewed} checked against code, ${byStatus.draft} draft · screenshots ${summary.assets.screenshotsCaptured} · videos ${summary.assets.videosRecorded}`);
console.log(`Errors ${errors.length} · warnings ${warnings.length} · drift ${drift.length} · metadata ${metadataIssues.length} · stale ${stale.length}`);
for (const p of errors) console.error(`  error  ${p.article}: ${p.message}`);
for (const d of drift) console.error(`  drift  ${d}`);

let failed = errors.length > 0 || drift.length > 0;
if (strict) failed ||= routesUndocumented.length > 0 || modulesWithoutArticles.length > 0 || actionsOpen.length > 0 || missingShots.length > 0 || byStatus.draft + byStatus.reviewed > 0 || warnings.length > 0 || metadataIssues.length > 0 || stale.length > 0;
if (failed) process.exitCode = 1;
