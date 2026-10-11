import { allModules } from "@/test/utils";
import type { ModulePermissions, UserRole } from "@/types/auth";
import { availableTabs, canViewTab, DASHBOARD_TABS, resolveTab, type DashboardTabId } from "./catalog";

const ids = (role: UserRole, modules?: ModulePermissions | null) => availableTabs({ role, modules }).map((t) => t.id);

describe("dashboard tab catalog", () => {
  it("gives every role the Overview first", () => {
    for (const role of ["superAdmin", "admin", "principal", "teacher", "accountant", "librarian", "receptionist", "parent", "student", "staff"] as UserRole[]) {
      expect(ids(role, allModules())[0]).toBe("overview");
    }
  });

  it.each<[UserRole, DashboardTabId[]]>([
    ["admin", ["overview", "executive", "finance", "admissions", "campus", "engagement", "hr", "academics"]],
    ["principal", ["overview", "executive", "finance", "admissions", "campus", "engagement", "hr", "academics"]],
    ["accountant", ["overview", "finance"]],
    ["teacher", ["overview", "teacher", "academics"]],
    ["librarian", ["overview", "campus"]],
    ["receptionist", ["overview", "admissions", "campus", "engagement"]],
    ["parent", ["overview"]],
    ["student", ["overview"]],
    ["superAdmin", ["overview"]],
  ])("%s sees the right tabs when every module is open", (role, expected) => {
    expect(ids(role, allModules())).toEqual(expected);
  });

  it("hides a tab when the viewer's modules don't include any that feed it", () => {
    const grants = { library: true, fees: true } as unknown as ModulePermissions;

    // Executive needs no module of its own; the rest follow the viewer's grants.
    expect(ids("admin", grants)).toEqual(["overview", "executive", "finance", "campus"]);
  });

  it("judges a custom role by its modules alone, and shows it nothing before they are known", () => {
    expect(ids("staff", null)).toEqual(["overview"]);
    const grants = { hostel: true } as unknown as ModulePermissions;
    expect(ids("staff", grants)).toEqual(["overview", "campus"]);
  });

  it("falls back to the role rules while modules are unknown (demo sign-in)", () => {
    expect(ids("principal", null)).toContain("finance");
  });

  it("resolves an unknown or forbidden ?tab= to the Overview", () => {
    const viewer = { role: "teacher" as const, modules: allModules() };
    expect(resolveTab("teacher", viewer)).toBe("teacher");
    expect(resolveTab("finance", viewer)).toBe("overview");
    expect(resolveTab("nope", viewer)).toBe("overview");
    expect(resolveTab(null, viewer)).toBe("overview");
  });

  it("has unique tab ids", () => {
    expect(new Set(DASHBOARD_TABS.map((t) => t.id)).size).toBe(DASHBOARD_TABS.length);
    expect(canViewTab(DASHBOARD_TABS[0], { role: "parent" })).toBe(true);
  });
});
