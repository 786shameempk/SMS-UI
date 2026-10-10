// Turns the help catalog into the index Ask School AI searches (AiService `HelpIndex`, schema 1).
// Pure: no file or network access, so the same function can run in Node (the export script) and in a test.
import { blocksText } from "./markdown.mjs";

export const INDEX_SCHEMA = 1;
const MAX_CHARS = 3800; // AiService rejects sections over 4000 characters

/** Splits plain text on paragraph boundaries so no piece passes `max`. */
function splitText(text, max) {
  if (text.length <= max) return [text];
  const out = [];
  let cur = "";
  for (const para of text.split(/\n{2,}|\n/)) {
    const piece = para.length > max ? para.slice(0, max) : para;
    if (cur && cur.length + piece.length + 1 > max) {
      out.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n${piece}` : piece;
  }
  if (cur) out.push(cur);
  return out;
}

export function buildHelpIndex(catalog, registry, { generatedOn = new Date().toISOString().slice(0, 10) } = {}) {
  const modules = new Map(catalog.modules.map((m) => [m.id, m]));
  const routeById = new Map(registry.ROUTES.map((r) => [r.id, r]));

  const routes = registry.ROUTES.map((r) => {
    const m = modules.get(r.moduleId);
    return {
      id: r.id,
      path: r.path,
      label: r.label,
      moduleId: r.moduleId,
      moduleTitle: m?.title ?? r.moduleId,
      moduleKey: m?.moduleKey ?? null,
      menuPath: registry.menuPathOf(r),
      deepLink: !!r.deepLink,
      audience: r.audience ?? null,
      public: !!r.public,
      platformOnly: m?.access === "platform",
    };
  });

  const tasks = catalog.tasks.map((t) => ({
    id: t.id,
    label: t.label,
    phrases: t.phrases,
    routeId: t.route && routeById.has(t.route) ? t.route : null,
    articleId: t.articleId,
    roles: t.roles ?? [],
  }));

  const chunks = [];
  for (const a of catalog.articles) {
    const m = modules.get(a.module);
    const route = a.route ? routeById.get(a.route) : undefined;
    const menuPath = route ? registry.menuPathOf(route) : (m?.menu ?? []);

    // Sections: everything before the first "##" is the overview; each "##" opens a new section.
    const sections = [{ heading: "Overview", blocks: [] }];
    for (const b of a.blocks) {
      if (b.type === "heading" && b.level <= 2) sections.push({ heading: b.text, blocks: [] });
      else sections[sections.length - 1].blocks.push(b);
    }
    let n = 0;
    for (const s of sections) {
      const text = blocksText(s.blocks).trim();
      if (!text) continue;
      const pieces = splitText(text, MAX_CHARS);
      pieces.forEach((piece, i) => {
        n += 1;
        chunks.push({
          id: `${a.id}#${n}`,
          articleId: a.id,
          title: a.title,
          moduleId: a.module,
          moduleTitle: m?.title ?? a.module,
          moduleKey: m?.moduleKey ?? null,
          kind: a.kind,
          access: a.access,
          roles: a.roles,
          routeId: route ? route.id : null,
          menuPath,
          heading: pieces.length > 1 ? `${s.heading} (${i + 1})` : s.heading,
          text: piece,
          taskIds: a.tasks.map((t) => t.id),
          keywords: a.keywords,
          status: a.status,
          url: `/help/a/${a.id}`,
        });
      });
    }
  }

  return {
    schemaVersion: INDEX_SCHEMA,
    revision: catalog.revision,
    appVersion: catalog.appVersion,
    generatedOn,
    routes,
    tasks,
    chunks,
  };
}
