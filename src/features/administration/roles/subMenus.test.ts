import { describe, expect, it } from "vitest";
import { getRoute } from "@/app/routeRegistry";
import { tabKey } from "@/store/subMenuStore";
import { PERMISSION_MODULES } from "./constants";
import { SUB_MENU_CATALOG } from "./subMenus";

describe("sub-menu catalogue", () => {
  it("points every page at a real route and a Permission matrix module", () => {
    for (const page of SUB_MENU_CATALOG) {
      expect(getRoute(page.routeId), page.routeId).toBeDefined();
      expect(PERMISSION_MODULES, page.routeId).toContain(page.matrixModule);
    }
  });

  it("has no repeated page and no repeated tab inside a page", () => {
    expect(new Set(SUB_MENU_CATALOG.map((p) => p.routeId)).size).toBe(SUB_MENU_CATALOG.length);
    for (const page of SUB_MENU_CATALOG) expect(new Set(page.tabs.map((t) => t.value)).size, page.routeId).toBe(page.tabs.length);
  });

  it("produces keys the server accepts", () => {
    const pattern = /^[a-z0-9][a-z0-9.-]{0,60}:[a-z0-9][a-z0-9.-]{0,60}$/;
    for (const page of SUB_MENU_CATALOG) for (const tab of page.tabs) expect(tabKey(page.routeId, tab.value)).toMatch(pattern);
  });

  it("lists the tabs added with newer features", () => {
    const tabs = (id: string) => SUB_MENU_CATALOG.find((p) => p.routeId === id)?.tabs.map((t) => t.value) ?? [];
    expect(tabs("attendance.home")).toEqual(expect.arrayContaining(["scan", "corrections", "exceptions", "setup"]));
    expect(tabs("communication.home")).toEqual(expect.arrayContaining(["log", "usage"]));
    expect(tabs("fees.home")).toEqual(expect.arrayContaining(["previous-dues", "gateways", "gateway-activity"]));
    expect(tabs("reports.home")).toEqual(expect.arrayContaining(["library", "favourites", "library-usage"]));
    expect(tabs("appraisal.questions")).toEqual(["questions", "criteria", "templates"]);
    expect(tabs("progress-cards.home")).toEqual(["generate", "published", "coscholastic", "templates", "grading"]);
  });
});
