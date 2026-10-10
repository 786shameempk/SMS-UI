// Generates the PDF manuals from the help catalogue.
//   npm run help:pdf                      public edition -> public/help/school-sphere-user-manual.pdf (published on the Help Center)
//   npm run help:pdf -- --edition=admin   administrator guide -> dist-docs/ (distributed by hand, never published openly)
//   npm run help:pdf -- --edition=all     every edition
//   npm run help:pdf -- --check           fail if the committed public PDF no longer matches the articles
// Needs Microsoft Edge or Google Chrome installed (driven through playwright-core; no browser is downloaded).
// Set HELP_BASE_URL to change the address printed in links and QR codes (default https://demo.sms-schoolsphere.com).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { buildCatalog, docsDir, loadRegistry, root } from "./lib/catalog.mjs";
import { EDITIONS, buildManualHtml, editionRevision, selectEdition } from "./lib/manual-html.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const wanted = flag("edition") ?? "public";
const checkOnly = args.includes("--check");
const preview = args.includes("--preview"); // also save every page as a PNG in dist-docs/preview, to look at the layout
const baseUrl = (process.env.HELP_BASE_URL ?? "https://demo.sms-schoolsphere.com").replace(/\/+$/, "");
const editions = wanted === "all" ? Object.keys(EDITIONS) : [wanted];
for (const e of editions) if (!EDITIONS[e]) throw new Error(`Unknown edition "${e}". Use public, admin, platform or all.`);

const manual = JSON.parse(readFileSync(join(docsDir, "manual.json"), "utf8"));
const publicDir = join(root, "public", "help");
const screenshotsDir = join(publicDir, "screenshots");
const distDir = join(root, "dist-docs");

const { catalog, problems } = await buildCatalog();
const errors = problems.filter((p) => p.severity === "error");
if (errors.length) {
  console.error(errors.map((p) => `  ${p.article}: ${p.message}`).join("\n"));
  throw new Error("The help articles have errors; fix them before building the PDF.");
}
const registry = await loadRegistry();

/** Screenshot bytes are part of the revision: a re-captured image must regenerate the PDF. */
function assetsRevision(articles) {
  const files = new Set(articles.flatMap((a) => a.blocks.filter((b) => b.type === "image" && b.file).map((b) => b.file)));
  return [...files].sort().map((f) => `${f}:${existsSync(join(screenshotsDir, f)) ? statSync(join(screenshotsDir, f)).size : 0}`).join("|");
}

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* try the next installed browser */
    }
  }
  throw new Error("Install Microsoft Edge or Google Chrome to build the PDF.");
}

function targetFor(edition) {
  const meta = EDITIONS[edition];
  const dir = edition === "public" ? publicDir : distDir;
  return { dir, pdf: join(dir, meta.file), sidecar: join(dir, meta.file.replace(/\.pdf$/, ".meta.json")) };
}

if (checkOnly) {
  const target = targetFor("public");
  const revision = editionRevision(selectEdition(catalog, "public"), manual, assetsRevision(selectEdition(catalog, "public")));
  const meta = existsSync(target.sidecar) ? JSON.parse(readFileSync(target.sidecar, "utf8")) : null;
  if (!existsSync(target.pdf) || meta?.revision !== revision) {
    console.error(`The published PDF is out of date (articles are at revision ${revision}, the PDF at ${meta?.revision ?? "none"}). Run: npm run help:pdf`);
    process.exit(1);
  }
  console.log(`The published PDF matches the articles (revision ${revision}, ${meta.pages} pages).`);
  process.exit(0);
}

const browser = await launch();
try {
  for (const edition of editions) {
    const articles = selectEdition(catalog, edition);
    if (articles.length === 0) {
      console.log(`${edition}: no articles in this edition, skipped.`);
      continue;
    }
    const revision = editionRevision(articles, manual, assetsRevision(articles));
    const generatedOn = new Date().toISOString().slice(0, 10);
    const { html } = await buildManualHtml({
      catalog,
      registry,
      edition,
      manual,
      baseUrl,
      revision,
      generatedOn,
      shotUrl: (file) => pathToFileURL(join(screenshotsDir, file)).href,
    });

    const { dir, pdf, sidecar } = targetFor(edition);
    mkdirSync(dir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    const htmlPath = join(distDir, `manual-${edition}.html`);
    writeFileSync(htmlPath, html);

    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.PagedConfig = { auto: false, after: () => (window.__pagedDone = true) };
    });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    await page.addScriptTag({ path: resolve(root, "node_modules", "pagedjs", "dist", "paged.polyfill.js") });
    await page.evaluate(() => window.PagedPolyfill.preview());
    await page.waitForFunction(() => window.__pagedDone === true, undefined, { timeout: 120_000 });
    const pages = await page.evaluate(() => document.querySelectorAll(".pagedjs_page").length);
    await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
    if (preview) {
      const previewDir = join(distDir, "preview");
      mkdirSync(previewDir, { recursive: true });
      const pageEls = await page.locator(".pagedjs_page").all();
      for (const [i, el] of pageEls.entries()) await el.screenshot({ path: join(previewDir, `${edition}-p${String(i + 1).padStart(2, "0")}.png`) });
    }
    await page.close();

    writeFileSync(sidecar, JSON.stringify({ edition, revision, generatedOn, pages, articles: articles.length, manualVersion: manual.manualVersion, baseUrl }, null, 2) + "\n");
    console.log(`${edition}: ${articles.length} articles, ${pages} pages -> ${pdf.replace(root, ".")} (revision ${revision})`);
  }
} finally {
  await browser.close();
}
