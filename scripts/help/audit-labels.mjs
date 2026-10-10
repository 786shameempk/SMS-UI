// Checks the labels the help articles name in bold against the running application, with a real (demo) sign-in.
//
//   HELP_AUDIT_LOGINS='[{"email":"...","password":"...","roles":["admin","principal"]}]' \
//   node scripts/help/audit-labels.mjs [--base http://127.0.0.1:5173] [--auth http://localhost:5118/] [--only article-id,...]
//
// For every article whose screen opens directly, it signs in as a person of the article's role, opens the screen, reads the
// text of every tab, and opens each "New / Add / Register ..." dialog (it never submits anything, never fills a field), then
// lists each bold label of the article that it could not find. A missing label is a prompt to look, not proof of an error: the
// label may live on a screen this audit does not reach (a record's page, a state that needs data), or be a person's own words.
//
// This is a READ-ONLY check against whatever data the environment holds; use a demo environment. Credentials come from the
// environment variable above and are never stored. It does not change an article's status: "verified" still means a person
// followed the article's steps.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { buildCatalog, root } from "./lib/catalog.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const base = opt("base", "http://127.0.0.1:5173").replace(/\/+$/, "");
const authUrl = opt("auth", "http://localhost:5118/");
const only = (opt("only", "") || "").split(",").filter(Boolean);
const logins = JSON.parse(process.env.HELP_AUDIT_LOGINS ?? "[]");
if (logins.length === 0) {
  console.error("Set HELP_AUDIT_LOGINS to a JSON array of { email, password, roles } for a demo environment.");
  process.exit(1);
}

const registry = await import(pathToFileURL(join(root, "src", "app", "routeRegistry.ts")).href);
const { catalog } = await buildCatalog();

const exe = [process.env.HELP_BROWSER, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"].filter(Boolean).find(existsSync);
if (!exe) {
  console.error("Microsoft Edge or Google Chrome was not found (set HELP_BROWSER).");
  process.exit(1);
}

const norm = (s) => (s ?? "").replace(/\*?\s*\((required|optional)\)/gi, "").replace(/\*/g, "").replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

/** Bold phrases in an article: the labels it asks the reader to look for. */
function boldLabels(blocks) {
  const found = new Set();
  const inl = (nodes) => {
    for (const n of nodes ?? []) {
      if (n.t === "bold") {
        const text = (n.c ?? []).map((c) => c.v ?? "").join("");
        if (text.length >= 3 && !/[.…]{2}/.test(text)) found.add(text);
      }
      if (n.c) inl(n.c);
    }
  };
  for (const b of blocks) {
    if (b.inline) inl(b.inline);
    if (b.items) for (const it of b.items) inl(Array.isArray(it) ? it : (it.inline ?? it));
    if (b.head) b.head.forEach(inl);
    if (b.rows) b.rows.forEach((r) => r.forEach(inl));
  }
  return [...found];
}

const OPENERS = /^(new|add|register|schedule|generate|record|issue|reserve|check in|assign|allocate|request|create|post|stock|log|raise|apply|manage|customi[sz]e|edit)\b/i;

async function collect(page) {
  const texts = [];
  const read = async () =>
    texts.push(
      await page.evaluate(() => {
        const bits = [...document.querySelectorAll("label,[aria-label],input[placeholder],textarea[placeholder],[title]")].map(
          (e) => `${e.textContent || ""} ${e.getAttribute("aria-label") || ""} ${e.getAttribute("placeholder") || ""} ${e.getAttribute("title") || ""}`,
        );
        return [document.body.innerText, ...bits].join("\n");
      }),
    );
  // Opens each "New / Add / ..." button on the current view, reads the dialog that appears, and closes it again. Nothing is filled or submitted.
  const openers = async () => {
    const names = await page.locator("button:visible:not([role=tab])").evaluateAll((els) => els.map((e) => (e.textContent || "").trim()).filter((t) => t && t.length <= 40));
    for (const label of [...new Set(names)].filter((n) => OPENERS.test(n))) {
      try {
        await page.locator("button:visible:not([role=tab])", { hasText: label }).first().click({ timeout: 2000 });
        await page.waitForSelector("[role=dialog]", { timeout: 2500 });
        await page.waitForTimeout(500);
        await read();
        if (process.env.HELP_AUDIT_DEBUG) console.error("  opened", label, texts.length);
      } catch {
        // not clickable or nothing opened: skip it
        if (process.env.HELP_AUDIT_DEBUG) console.error("  could not open", label);
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  };
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
  await read();
  await openers();
  const count = await page.locator("[role=tab]").count();
  for (let i = 0; i < count; i++) {
    try {
      await page.locator("[role=tab]").nth(i).click({ timeout: 2000 });
      await page.waitForTimeout(800);
      await read();
      await openers();
    } catch {
      // a tab that cannot be opened is simply not read
    }
  }
  return norm(texts.join("\n"));
}

const browser = await chromium.launch({ executablePath: exe, headless: true });
const report = [];
for (const login of logins) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/login", { waitUntil: "domcontentloaded" });
  const ok = await page.evaluate(async ({ email, password, authUrl }) => {
    try {
      const http = await import("/src/lib/httpClient.ts");
      http.authHttpClient.defaults.baseURL = authUrl;
      const api = await import("/src/features/authentication/api.ts");
      const store = await import("/src/store/authStore.ts");
      const r = await api.login({ email, password, rememberMe: false });
      store.useAuthStore.getState().setSession(r.user, r.token, r.permissions, true, r.refreshToken);
      return true;
    } catch (e) {
      return String(e?.message ?? e);
    }
  }, { email: login.email, password: login.password, authUrl });
  if (ok !== true) {
    console.error(`Sign-in failed for ${login.email}: ${ok}`);
    await ctx.close();
    continue;
  }
  const mine = catalog.articles.filter((a) => a.route && (only.length === 0 || only.includes(a.id)) && a.roles.some((r) => (login.roles ?? []).includes(r)));
  const done = new Set();
  for (const a of mine) {
    const route = registry.getRoute(a.route);
    if (!route || !route.deepLink || route.public || done.has(a.id)) continue;
    done.add(a.id);
    try {
      await page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, route.path);
      // A cold dev server compiles each screen on first visit: wait for the page heading, then for the network to settle.
      await page.waitForSelector("h1", { timeout: 20000 }).catch(() => {});
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);
      const where = new URL(page.url()).pathname;
      if (where !== route.path) {
        report.push({ article: a.id, as: login.email, opened: false, note: `redirected to ${where}` });
        continue;
      }
      const text = await collect(page);
      const missing = boldLabels(a.blocks).filter((l) => !text.includes(norm(l)));
      report.push({ article: a.id, as: login.email, opened: true, checked: boldLabels(a.blocks).length, missing });
      console.log(`${a.id}: ${missing.length === 0 ? "all found" : "missing " + missing.map((m) => `"${m}"`).join(", ")}`);
    } catch (e) {
      report.push({ article: a.id, as: login.email, opened: false, note: String(e.message).split("\n")[0] });
    }
  }
  await ctx.close();
}
await browser.close();
const out = join(root, "dist-docs", "label-audit.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\n${report.filter((r) => r.opened).length} articles opened, ${report.filter((r) => r.opened && r.missing.length === 0).length} with every bold label found. Details: ${out}`);
