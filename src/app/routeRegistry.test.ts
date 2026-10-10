import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseNav, parseRoutes } from "../../scripts/help/lib/sources.mjs";
import { MODULES, ROUTES, getModule, menuPathOf, routeForPath } from "./routeRegistry";

const read = (...parts: string[]) => readFileSync(join(import.meta.dirname, ...parts), "utf8").replace(/\r\n/g, "\n");
// Wildcard routes are redirects (/guide/*), not screens.
const routerRoutes = parseRoutes(read("router.tsx")).filter((r) => !r.path.endsWith("/*"));
const nav = parseNav(read("..", "constants", "nav.ts"));
const navEntries = [
  ...nav.core.map((it) => ({ ...it, section: null as string | null, moduleKey: it.permissionKey })),
  ...nav.sections.flatMap((s) => s.items.map((it) => ({ ...it, section: s.title as string | null, moduleKey: it.permissionKey ?? s.permissionKey }))),
];
const menuKeys = new Set(navEntries.map((e) => e.moduleKey).filter(Boolean));

describe("route registry", () => {
  it("has unique ids and paths, and every route belongs to a known module", () => {
    expect(new Set(ROUTES.map((r) => r.id)).size).toBe(ROUTES.length);
    expect(new Set(ROUTES.map((r) => r.path)).size).toBe(ROUTES.length);
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length);
    expect(ROUTES.filter((r) => !getModule(r.moduleId)).map((r) => r.id)).toEqual([]);
  });

  it("lists every route the router defines, and nothing the router does not", () => {
    const inRouter = new Set(routerRoutes.map((r) => r.path));
    const inRegistry = new Set(ROUTES.map((r) => r.path));
    expect([...inRouter].filter((p) => !inRegistry.has(p))).toEqual([]);
    expect([...inRegistry].filter((p) => !inRouter.has(p))).toEqual([]);
  });

  it("describes every navigation entry with its label, module permission and audience", () => {
    for (const entry of navEntries) {
      const route = ROUTES.find((r) => r.path === entry.to);
      expect(route, `no route for menu entry ${entry.label}`).toBeDefined();
      expect(route!.menuItem, entry.to).toBe(entry.label);
      expect(route!.audience ?? null, entry.to).toBe(entry.audience);
      const module = getModule(route!.moduleId)!;
      if (entry.superAdminOnly) expect(module.defaultRoles, entry.to).toEqual(["superAdmin"]);
      else expect(module.moduleKey, `${entry.label} (${entry.to})`).toBe(entry.moduleKey);
      const menu = entry.section;
      expect(menuPathOf(route!), entry.to).toEqual(menu ? [menu, entry.label] : [entry.label]);
    }
  });

  it("only marks screens as menu items when the menu has them", () => {
    const inMenu = new Set(navEntries.map((e) => e.to));
    expect(ROUTES.filter((r) => r.menuItem && !inMenu.has(r.path)).map((r) => r.path)).toEqual([]);
  });

  it("uses only permission keys the menu itself uses", () => {
    expect(MODULES.filter((m) => m.moduleKey && !menuKeys.has(m.moduleKey)).map((m) => `${m.id}:${m.moduleKey}`)).toEqual([]);
  });

  it("marks only parameter-free routes as deep links", () => {
    expect(ROUTES.filter((r) => r.deepLink === r.path.includes(":")).map((r) => r.id)).toEqual([]);
  });

  it("resolves concrete URLs to their screen, preferring fixed segments over parameters", () => {
    expect(routeForPath("/students")?.id).toBe("students.list");
    expect(routeForPath("/students/abc-123")?.id).toBe("students.profile");
    expect(routeForPath("/students/abc-123/")?.id).toBe("students.profile");
    expect(routeForPath("/online-exams/exams/new")?.id).toBe("online-exams.new");
    expect(routeForPath("/online-exams/exams/9/edit")?.id).toBe("online-exams.edit");
    expect(routeForPath("/talents/mine")?.id).toBe("talent-showcase.mine");
    expect(routeForPath("/talents/42")?.id).toBe("talent-showcase.detail");
    expect(routeForPath("/online-classes/5/room?x=1")?.id).toBe("online-classes.room");
    expect(routeForPath("/nowhere")).toBeUndefined();
  });
});
