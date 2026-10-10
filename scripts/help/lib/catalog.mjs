// Builds the help catalogue from docs/help/**/*.md and validates it against the route registry. The catalogue is the single
// source for the Help Center (via the Vite plugin), the PDF manual and the Ask School AI index.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { blocksText, inlineText, parseBlocks, parseInline, splitFrontMatter } from "./markdown.mjs";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const docsDir = join(root, "docs", "help");

export const KINDS = ["overview", "task", "reference", "faq", "troubleshooting"];
export const STATUSES = ["draft", "reviewed", "verified"];
export const ACCESS = ["public", "member", "admin", "platform"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_")) continue; // _inventory, _templates: not articles
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".md") && !["readme.md", "videos.md", "status.md"].includes(name.toLowerCase())) out.push(p);
  }
  return out;
}

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

/** The registry is TypeScript; Node strips the types when importing it. */
export async function loadRegistry() {
  return import(pathToFileURL(join(root, "src", "app", "routeRegistry.ts")).href);
}

function walkInline(nodes, visit) {
  for (const n of nodes) {
    visit(n);
    if (n.c) walkInline(n.c, visit);
  }
}

function inlineOfBlock(b) {
  if (b.type === "p" || b.type === "callout") return [b.inline];
  if (b.type === "steps") return b.items.flatMap((s) => [s.inline, ...s.notes]);
  if (b.type === "list") return b.items;
  if (b.type === "table") return [...b.head, ...b.rows.flat()];
  return [];
}

export async function buildCatalog({ docs = docsDir } = {}) {
  const registry = await loadRegistry();
  const problems = [];
  const warn = (article, message, severity = "error") => problems.push({ article, message, severity });

  const screenshots = readJson(join(docs, "assets", "screenshots.json"), []);
  const videos = readJson(join(docs, "assets", "videos.json"), []);
  const shotById = new Map(screenshots.map((s) => [s.id, s]));
  const videoById = new Map(videos.map((v) => [v.id, v]));

  const files = existsSync(docs) ? walk(docs).sort() : [];
  const articles = [];
  const hash = createHash("sha256");

  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const raw = readFileSync(file, "utf8");
    hash.update(rel).update(raw);
    let fm;
    try {
      fm = splitFrontMatter(raw);
    } catch (e) {
      warn(rel, `front matter: ${e.message}`);
      continue;
    }
    const { data, body } = fm;
    const id = data.id;
    if (!id || typeof id !== "string") {
      warn(rel, "missing `id` in front matter");
      continue;
    }
    for (const key of ["title", "module", "kind"]) if (!data[key]) warn(id, `missing \`${key}\``);
    const module = registry.getModule(data.module);
    if (data.module && !module) warn(id, `unknown module "${data.module}"`);
    if (data.kind && !KINDS.includes(data.kind)) warn(id, `kind must be one of ${KINDS.join(", ")}`);
    const status = data.status ?? "draft";
    if (!STATUSES.includes(status)) warn(id, `status must be one of ${STATUSES.join(", ")}`);
    if (status === "verified" && !data.verifiedOn) warn(id, "verified articles need `verifiedOn`");
    const access = data.access ?? module?.access ?? "member";
    if (!ACCESS.includes(access)) warn(id, `access must be one of ${ACCESS.join(", ")}`);
    const roles = data.roles ?? module?.defaultRoles ?? [];
    for (const r of roles) if (!registry.HELP_ROLES.includes(r)) warn(id, `unknown role "${r}"`);

    const route = data.route ? registry.getRoute(data.route) : undefined;
    if (data.route && !route) warn(id, `unknown route "${data.route}"`);
    if (route && module && route.moduleId !== module.id) warn(id, `route ${route.id} belongs to module ${route.moduleId}, not ${module.id}`, "warning");

    const blocks = parseBlocks(body);
    const h1 = blocks.findIndex((b) => b.type === "heading" && b.level === 1);
    if (h1 >= 0) warn(id, "the title comes from front matter; do not add a # heading", "warning");

    // Links and images.
    let lead = "";
    const lead1 = blocks.find((b) => b.type === "p");
    if (lead1) lead = inlineText(lead1.inline);
    const helpLinks = [];
    const routeLinks = [];
    for (const b of blocks) {
      for (const inl of inlineOfBlock(b)) {
        walkInline(inl, (n) => {
          if (n.t === "help") helpLinks.push(n.id);
          if (n.t === "route") {
            routeLinks.push(n.id);
            const target = registry.getRoute(n.id);
            if (!target) warn(id, `link to unknown route "${n.id}"`);
            else if (!target.deepLink) warn(id, `route link "${n.id}" needs a record, so it cannot be opened directly`, "warning");
          }
        });
      }
      if (b.type === "image") {
        const shot = shotById.get(b.shot);
        b.file = shot?.file ?? null;
        if (!shot) warn(id, `screenshot "${b.shot}" is not in assets/screenshots.json`, "warning");
      }
    }

    const tasks = (data.tasks ?? []).map((t) => ({
      id: t.id,
      label: t.label,
      phrases: Array.isArray(t.phrases) ? t.phrases : [],
      route: t.route ?? data.route ?? null,
      hint: t.hint ?? null,
      roles,
    }));
    for (const t of tasks) {
      if (!t.id || !t.label) warn(id, "every task needs `id` and `label`");
      if (t.phrases.length === 0) warn(id, `task ${t.id}: add some \`phrases\` people would actually type`, "warning");
      const target = t.route ? registry.getRoute(t.route) : undefined;
      if (!target) warn(id, `task ${t.id}: no valid route`);
      else if (!target.deepLink) warn(id, `task ${t.id}: route ${target.id} needs a record`, "warning");
    }

    const headings = blocks.filter((b) => b.type === "heading" && b.level >= 2).map((b) => ({ id: b.id, text: b.text, level: b.level }));
    for (const shotId of data.screenshots ?? []) if (!shotById.has(shotId)) warn(id, `screenshot "${shotId}" is not in assets/screenshots.json`, "warning");
    if (data.video && !videoById.has(data.video)) warn(id, `video "${data.video}" is not in assets/videos.json`, "warning");

    articles.push({
      id,
      title: data.title ?? id,
      module: data.module,
      kind: data.kind ?? "reference",
      access,
      roles,
      route: data.route ?? null,
      summary: data.summary ?? lead,
      related: data.related ?? [],
      keywords: data.keywords ?? [],
      tasks,
      order: data.order ?? 100,
      status,
      verifiedOn: data.verifiedOn ?? null,
      e2e: data.e2e ?? "none",
      screenshots: data.screenshots ?? [],
      video: data.video ?? null,
      helpLinks,
      routeLinks,
      headings,
      blocks,
      text: blocksText(blocks),
      source: rel,
    });
  }

  // Cross-article checks.
  const byId = new Map();
  for (const a of articles) {
    if (byId.has(a.id)) warn(a.id, `duplicate id (also ${byId.get(a.id).source})`);
    byId.set(a.id, a);
  }
  const taskIds = new Map();
  for (const a of articles) {
    for (const r of a.related) if (!byId.has(r)) warn(a.id, `related article "${r}" does not exist`);
    for (const l of a.helpLinks) if (!byId.has(l)) warn(a.id, `link to unknown article "${l}"`);
    for (const t of a.tasks) {
      if (taskIds.has(t.id)) warn(a.id, `duplicate task id "${t.id}" (also in ${taskIds.get(t.id)})`);
      taskIds.set(t.id, a.id);
    }
  }

  const tasks = articles.flatMap((a) => a.tasks.map((t) => ({ ...t, articleId: a.id, moduleId: a.module })));
  const pkg = readJson(join(root, "package.json"), {});
  const catalog = {
    appVersion: pkg.version ?? "0.0.0",
    revision: hash.digest("hex").slice(0, 10),
    modules: registry.MODULES,
    articles: articles.sort((a, b) => a.module.localeCompare(b.module) || a.order - b.order || a.title.localeCompare(b.title)),
    tasks,
    screenshots,
    videos,
  };
  return { catalog, problems };
}

export { parseInline };
