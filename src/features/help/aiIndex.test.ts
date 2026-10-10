import { describe, expect, it } from "vitest";
import * as registry from "@/app/routeRegistry";
import { buildCatalog } from "../../../scripts/help/lib/catalog.mjs";
import { buildHelpIndex } from "../../../scripts/help/lib/ai-index.mjs";

// These mirror what AiService's HelpKnowledge.Validate enforces, so a bad index fails here and not at publish time.
describe("Ask School AI help index", async () => {
  const { catalog } = await buildCatalog();
  const index = buildHelpIndex(catalog, registry);

  it("has content in schema 1", () => {
    expect(index.schemaVersion).toBe(1);
    expect(index.chunks.length).toBeGreaterThan(0);
  });

  it("has unique ids and every reference resolves", () => {
    const routes = new Set(index.routes.map((r) => r.id));
    expect(routes.size).toBe(index.routes.length);
    expect(new Set(index.tasks.map((t) => t.id)).size).toBe(index.tasks.length);
    expect(new Set(index.chunks.map((c) => c.id)).size).toBe(index.chunks.length);
    for (const t of index.tasks) if (t.routeId) expect(routes.has(t.routeId)).toBe(true);
    for (const c of index.chunks) if (c.routeId) expect(routes.has(c.routeId)).toBe(true);
  });

  it("keeps sections short and access classes valid", () => {
    for (const c of index.chunks) {
      expect(c.text.length).toBeLessThanOrEqual(4000);
      expect(["public", "member", "admin", "platform"]).toContain(c.access);
    }
  });

  it("never marks a record-specific screen as directly openable", () => {
    for (const r of index.routes) if (r.path.includes(":")) expect(r.deepLink).toBe(false);
  });
});
