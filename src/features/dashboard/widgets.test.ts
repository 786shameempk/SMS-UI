import type { ModulePermissions } from "@/types/auth";
import { widgetsForRole } from "./widgets";

const ids = (...args: Parameters<typeof widgetsForRole>) => widgetsForRole(...args).map((w) => w.id);

describe("widgetsForRole", () => {
  it("offers a module's widget only to users who can open that module", () => {
    const withLibrary = { library: true } as ModulePermissions;
    const withoutLibrary = { library: false } as ModulePermissions;

    expect(ids("librarian", false, withLibrary)).toContain("libraryDue");
    expect(ids("teacher", false, withoutLibrary)).not.toContain("libraryDue");
    // No permission map yet (mock sign-in): fall back to the role rules alone.
    expect(ids("teacher", false, null)).toContain("libraryDue");
  });

  it("keeps the role and all-branches rules", () => {
    expect(ids("teacher", false, null)).not.toContain("revenue");
    expect(ids("admin", false, null)).not.toContain("scopeOverview");
  });
});
