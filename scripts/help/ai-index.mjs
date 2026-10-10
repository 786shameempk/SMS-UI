// Writes the Ask School AI index from the help catalog.
//   node scripts/help/ai-index.mjs                 -> dist-docs/help-index.json
//   node scripts/help/ai-index.mjs --publish URL   -> also PUT it to AiService (needs HELP_PUBLISH_TOKEN, a SuperAdmin token)
// The index holds product documentation only, never school data. Drafts are included but flagged by `status`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildCatalog, root } from "./lib/catalog.mjs";
import { buildHelpIndex } from "./lib/ai-index.mjs";

const registry = await import(pathToFileURL(join(root, "src", "app", "routeRegistry.ts")).href);
const { catalog, problems } = await buildCatalog();
const errors = problems.filter((p) => p.severity !== "warning");
if (errors.length) {
  for (const p of errors) console.error(`${p.article}: ${p.message}`);
  process.exit(1);
}

const index = buildHelpIndex(catalog, registry);
const dir = join(root, "dist-docs");
mkdirSync(dir, { recursive: true });
const file = join(dir, "help-index.json");
writeFileSync(file, JSON.stringify(index));
console.log(`Wrote ${file}: ${index.chunks.length} sections from ${catalog.articles.length} articles, ${index.tasks.length} tasks, ${index.routes.length} screens (revision ${index.revision}).`);

const at = process.argv.indexOf("--publish");
if (at > 0) {
  const base = process.argv[at + 1];
  const token = process.env.HELP_PUBLISH_TOKEN;
  if (!base || !token) {
    console.error("Publishing needs a URL argument and HELP_PUBLISH_TOKEN in the environment.");
    process.exit(1);
  }
  const res = await fetch(`${base.replace(/\/+$/, "")}/api/ai/help/index`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(index),
  });
  console.log(res.ok ? "Published." : `Publish failed: ${res.status} ${await res.text()}`);
  process.exit(res.ok ? 0 : 1);
}
