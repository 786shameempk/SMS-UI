import type { ModulePermissions } from "@/types/auth";
import { ANONYMOUS, type Viewer } from "./access";
import { clearUnsavedEdits, hasUnsavedEdits, isNavigationAction, resolveNavigation, trackFormEdits } from "./navigation";

const perms = (...on: string[]) => Object.fromEntries(on.map((k) => [k, true])) as unknown as ModulePermissions;
const teacher: Viewer = { role: "teacher", permissions: perms("students") };

describe("navigation actions", () => {
  it("accepts only the typed shape", () => {
    expect(isNavigationAction({ type: "navigate", routeId: "students.list" })).toBe(true);
    expect(isNavigationAction({ type: "navigate", routeId: "students.list", taskId: "t", reason: "r" })).toBe(true);
    for (const bad of [null, "students.list", { type: "navigate" }, { type: "open", routeId: "x" }, { type: "navigate", routeId: 3 }, { type: "navigate", routeId: "a", taskId: 1 }]) {
      expect(isNavigationAction(bad)).toBe(false);
    }
  });

  it("resolves a registered screen to its address from the route table", () => {
    expect(resolveNavigation({ type: "navigate", routeId: "students.list" }, teacher)).toMatchObject({ status: "ok", path: "/students", menuPath: ["Academics", "Students"] });
  });

  it("ignores any address in the action: only the id is used", () => {
    const hostile = { type: "navigate", routeId: "students.list", path: "https://evil.example/phish", href: "javascript:alert(1)", url: "/admin/azure" };
    expect(resolveNavigation(hostile, teacher)).toMatchObject({ status: "ok", path: "/students" });
  });

  it("rejects unknown ids, ids that need a record, and made-up shapes", () => {
    expect(resolveNavigation({ type: "navigate", routeId: "does.not.exist" }, teacher)).toEqual({ status: "invalid" });
    expect(resolveNavigation({ type: "navigate", routeId: "students.profile" }, teacher)).toEqual({ status: "invalid" });
    expect(resolveNavigation({ type: "navigate", routeId: "/students" }, teacher)).toEqual({ status: "invalid" });
    expect(resolveNavigation("students.list", teacher)).toEqual({ status: "invalid" });
  });

  it("denies, with a reason, a screen the account cannot open", () => {
    const denied = resolveNavigation({ type: "navigate", routeId: "fees.home" }, teacher);
    expect(denied).toMatchObject({ status: "denied" });
    expect((denied as { message: string }).message).toMatch(/not available to your account/);
    expect(resolveNavigation({ type: "navigate", routeId: "azure.overview" }, { role: "admin", permissions: perms() })).toMatchObject({ status: "denied" });
    expect(resolveNavigation({ type: "navigate", routeId: "students.list" }, ANONYMOUS)).toMatchObject({ status: "denied", message: "Sign in to open this screen." });
  });
});

describe("noticing unsaved edits", () => {
  let stop: () => void;
  beforeEach(() => {
    clearUnsavedEdits();
    stop = trackFormEdits();
    document.body.innerHTML = `<form id="f"><input id="name" /></form><input id="outside" /><input id="q" type="search" /><div data-unsaved-ignore><form><textarea id="chat"></textarea></form></div>`;
  });
  afterEach(() => {
    stop();
    document.body.innerHTML = "";
  });
  const type = (id: string) => document.getElementById(id)!.dispatchEvent(new Event("input", { bubbles: true }));

  it("starts clean and notices typing inside a form", () => {
    expect(hasUnsavedEdits()).toBe(false);
    type("name");
    expect(hasUnsavedEdits()).toBe(true);
  });

  it("forgets the edits once the form is submitted or the page changes", () => {
    type("name");
    document.getElementById("f")!.dispatchEvent(new Event("submit", { bubbles: true }));
    expect(hasUnsavedEdits()).toBe(false);
    type("name");
    clearUnsavedEdits();
    expect(hasUnsavedEdits()).toBe(false);
  });

  it("ignores typing outside forms, search boxes and the assistant's own message box", () => {
    type("outside");
    type("q");
    type("chat");
    expect(hasUnsavedEdits()).toBe(false);
  });
});
