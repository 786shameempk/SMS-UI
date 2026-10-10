// Captures help screenshots of the running application with synthetic data only.
//
//   npm run dev -- --host 127.0.0.1 --port 5173      (in another terminal)
//   node scripts/help/screenshots.mjs [--base http://127.0.0.1:5173] [--only id1,id2] [--dry-run]
//
// Why the data is always synthetic: every request the page makes to anything other than the app's own origin (the API
// services) is answered by this script from docs/help/assets/fixtures/*.json, or with an empty reply. The real backends are
// never contacted, so no real student, staff or financial record can reach an image. The session is a made-up one.
//
// Plan: docs/help/assets/screenshot-plan.json, an array of
//   { id, route, role, viewport: "desktop"|"tablet"|"mobile", alt, caption?, fixtures?: ["students"], click?: ["Register student"], waitFor?: "css selector" }
// `route` is a routeRegistry id that opens without a record (no :params). Output goes to public/help/screenshots/<id>.png and
// is listed in docs/help/assets/screenshots.json. A capture that fails is reported and not listed.
//
// Needs Microsoft Edge or Google Chrome (driven through playwright-core; nothing is downloaded).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { root } from "./lib/catalog.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const base = opt("base", "http://127.0.0.1:5173").replace(/\/+$/, "");
const only = opt("only", "")?.split(",").filter(Boolean) ?? [];
const dryRun = args.includes("--dry-run");

const assets = join(root, "docs", "help", "assets");
const outDir = join(root, "public", "help", "screenshots");
const registry = await import(pathToFileURL(join(root, "src", "app", "routeRegistry.ts")).href);

const VIEWPORTS = { desktop: { width: 1366, height: 820 }, tablet: { width: 820, height: 1100 }, mobile: { width: 390, height: 844 } };
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);

const plan = readJson(join(assets, "screenshot-plan.json"), []);
const fixtureFiles = new Map();
const fixtureDir = join(assets, "fixtures");
if (existsSync(fixtureDir)) for (const f of readdirSync(fixtureDir)) if (f.endsWith(".json")) fixtureFiles.set(f.slice(0, -5), readJson(join(fixtureDir, f), []));

// Made-up people; the names are obviously fictional. Every module is on so any screen can be shown.
const SYNTHETIC_USERS = {
  admin: { id: "00000000-0000-0000-0000-000000000001", name: "Demo Administrator", email: "admin@example.test", role: "admin" },
  principal: { id: "00000000-0000-0000-0000-000000000002", name: "Demo Principal", email: "principal@example.test", role: "principal" },
  teacher: { id: "00000000-0000-0000-0000-000000000003", name: "Demo Teacher", email: "teacher@example.test", role: "teacher" },
  parent: { id: "00000000-0000-0000-0000-000000000004", name: "Demo Parent", email: "parent@example.test", role: "parent" },
  student: { id: "00000000-0000-0000-0000-000000000005", name: "Demo Student", email: "student@example.test", role: "student" },
  superAdmin: { id: "00000000-0000-0000-0000-000000000006", name: "Demo Platform Admin", email: "platform@example.test", role: "superAdmin" },
};

function sessionFor(role) {
  const base = SYNTHETIC_USERS[role] ?? SYNTHETIC_USERS.admin;
  const permissions = Object.fromEntries(registry.MODULES.filter((m) => m.moduleKey).map((m) => [m.moduleKey, true]));
  return {
    state: {
      token: "synthetic-capture-token",
      refreshToken: null,
      user: { ...base, tenantId: "demo-school", branchId: "demo-branch", allBranchAccess: role === "admin" || role === "superAdmin", avatarUrl: null },
      modulePermissions: { dashboard: true, ...permissions },
      expiresAt: Date.now() + 1000 * 60 * 60,
      activeTenantId: "demo-school",
      activeBranchId: "demo-branch",
    },
    version: 0,
  };
}

function findBrowser() {
  const candidates = [
    process.env.HELP_BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

const problems = [];
const targets = plan.filter((p) => only.length === 0 || only.includes(p.id));
for (const p of targets) {
  const route = registry.getRoute(p.route);
  if (!route) problems.push(`${p.id}: unknown route "${p.route}"`);
  else if (route.path.includes(":")) problems.push(`${p.id}: route "${p.route}" needs a record (${route.path}); use a screen that opens directly`);
  if (!VIEWPORTS[p.viewport ?? "desktop"]) problems.push(`${p.id}: unknown viewport "${p.viewport}"`);
  for (const f of p.fixtures ?? []) if (!fixtureFiles.has(f)) problems.push(`${p.id}: fixture "${f}" not found in docs/help/assets/fixtures`);
}
if (problems.length) {
  for (const m of problems) console.error(m);
  process.exit(1);
}
if (targets.length === 0) {
  console.log("Nothing to capture: docs/help/assets/screenshot-plan.json has no matching entries.");
  process.exit(0);
}
if (dryRun) {
  for (const p of targets) console.log(`would capture ${p.id}: ${registry.getRoute(p.route).path} as ${p.role ?? "admin"} (${p.viewport ?? "desktop"})`);
  process.exit(0);
}

const exe = findBrowser();
if (!exe) {
  console.error("Microsoft Edge or Google Chrome was not found. Install one, or set HELP_BROWSER to its executable path.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const manifestPath = join(assets, "screenshots.json");
const manifest = readJson(manifestPath, []);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const appOrigin = new URL(base).origin;
let captured = 0;
let failed = 0;

for (const p of targets) {
  const viewport = p.viewport ?? "desktop";
  const route = registry.getRoute(p.route);
  const context = await browser.newContext({ viewport: VIEWPORTS[viewport], deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
  const session = sessionFor(p.role ?? "admin");
  await context.addInitScript((s) => {
    try {
      localStorage.setItem("sms-auth", JSON.stringify(s));
    } catch {
      // storage blocked: the capture will fail visibly at the sign-in page
    }
  }, route.public ? { state: { token: null, user: null, expiresAt: null }, version: 0 } : session);

  const used = (p.fixtures ?? []).flatMap((name) => fixtureFiles.get(name));
  await context.route("**/*", async (r) => {
    const url = r.request().url();
    if (url.startsWith(appOrigin) || url.startsWith("data:") || url.startsWith("blob:")) return r.continue();
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return r.continue();
    // Anything else is an API call: answer from fixtures, never from a real service.
    const hit = used.find((f) => url.includes(f.match) && (!f.method || f.method === r.request().method()));
    if (hit) return r.fulfill({ status: hit.status ?? 200, contentType: "application/json", body: JSON.stringify(hit.body) });
    return r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  const page = await context.newPage();
  try {
    await page.goto(base + route.path, { waitUntil: "networkidle", timeout: 30000 });
    // Clicks come first (they open the dialog the wait is for); a plain screen just waits.
    for (const label of p.click ?? []) await page.getByRole("button", { name: label, exact: true }).or(page.getByRole("menuitem", { name: label, exact: true })).first().click({ timeout: 15000 });
    if (p.waitFor) await page.waitForSelector(p.waitFor, { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(outDir, `${p.id}.png`), fullPage: p.fullPage === true });
    const entry = { id: p.id, file: `${p.id}.png`, alt: p.alt, viewport, route: p.route, capturedOn: new Date().toISOString().slice(0, 10), source: "playwright", dataset: "synthetic" };
    const at = manifest.findIndex((m) => m.id === p.id);
    if (at >= 0) manifest[at] = entry;
    else manifest.push(entry);
    captured += 1;
    console.log(`captured ${p.id}`);
  } catch (err) {
    failed += 1;
    console.error(`FAILED ${p.id}: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
  } finally {
    await context.close();
  }
}

await browser.close();
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${captured} captured, ${failed} failed. Review every image before committing: check that nothing but synthetic data is visible.`);
process.exit(failed ? 1 : 0);
