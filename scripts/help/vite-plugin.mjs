// Serves the help catalogue as `virtual:help-catalog`, built from docs/help at dev start and on every build, and rebuilt
// while `npm run dev` runs whenever an article or the route registry changes.
import { join } from "node:path";
import { buildCatalog, docsDir, root } from "./lib/catalog.mjs";

const VIRTUAL = "virtual:help-catalog";
const RESOLVED = "\0" + VIRTUAL;

export default function helpCatalog() {
  return {
    name: "help-catalog",
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },
    async load(id) {
      if (id !== RESOLVED) return null;
      const { catalog, problems } = await buildCatalog();
      // Broken articles fail the build; warnings are reported by `npm run help:check`.
      const errors = problems.filter((p) => p.severity === "error");
      if (errors.length) {
        throw new Error("Help articles have errors:\n" + errors.map((p) => `  ${p.article}: ${p.message}`).join("\n"));
      }
      this.addWatchFile(join(root, "src", "app", "routeRegistry.ts"));
      this.addWatchFile(join(docsDir, "assets", "screenshots.json"));
      this.addWatchFile(join(docsDir, "assets", "videos.json"));
      return `export default ${JSON.stringify(catalog)};`;
    },
    configureServer(server) {
      server.watcher.add(docsDir);
      const reload = (file) => {
        const path = file.replace(/\\/g, "/");
        if (!path.includes("/docs/help/") && !path.endsWith("routeRegistry.ts")) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("change", reload);
      server.watcher.on("add", reload);
      server.watcher.on("unlink", reload);
    },
  };
}
