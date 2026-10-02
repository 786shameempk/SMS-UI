import { SIGN_OUT_REASON_KEY, useAuthStore } from "./authStore";
import { allModules, makeUser } from "@/test/utils";
import { hasAllBranchAccess } from "@/types/auth";

const store = () => useAuthStore.getState();

describe("authStore", () => {
  beforeEach(() => store().clearAuth());

  it("starts a session scoped to the user's own tenant and branch", () => {
    store().setSession(makeUser("teacher", { tenantId: "tenant-a", branchId: "tenant-a-north" }), "access", allModules(), false, "refresh");

    expect(store()).toMatchObject({ token: "access", refreshToken: "refresh", activeTenantId: "tenant-a", activeBranchId: "tenant-a-north" });
    expect(store().isSessionValid()).toBe(true);
  });

  it("puts all-branch users on their tenant's main campus, and super admins on the default tenant", () => {
    store().setSession(makeUser("admin", { tenantId: "tenant-a", branchId: null }), "t", allModules());
    expect(store().activeBranchId).toBe("tenant-a-main");

    store().setSession(makeUser("superAdmin"), "t", allModules());
    expect([store().activeTenantId, store().activeBranchId]).toEqual(["tenant-educore", "tenant-educore-main"]);
  });

  it("remembers a session for 30 days, otherwise 12 hours", () => {
    const now = Date.now();
    store().setSession(makeUser(), "t", allModules(), true);
    expect(store().expiresAt! - now).toBeGreaterThan(29 * 24 * 3600_000);

    store().setSession(makeUser(), "t", allModules(), false);
    expect(store().expiresAt! - now).toBeLessThanOrEqual(12 * 3600_000 + 1000);
  });

  it("switching tenant resets the branch to that tenant's main campus", () => {
    store().setActiveBranchId("tenant-educore-north");
    store().setActiveTenantId("tenant-b");

    expect([store().activeTenantId, store().activeBranchId]).toEqual(["tenant-b", "tenant-b-main"]);
  });

  it("swaps in renewed tokens without touching the user", () => {
    store().setSession(makeUser(), "old", allModules(), true, "old-refresh");
    store().setTokens("new", "new-refresh");

    expect(store()).toMatchObject({ token: "new", refreshToken: "new-refresh" });
    expect(store().user?.email).toBe("user@school.test");
  });

  it("treats an expired or missing token as an invalid session", () => {
    store().setSession(makeUser(), "t", allModules());
    useAuthStore.setState({ expiresAt: Date.now() - 1 });
    expect(store().isSessionValid()).toBe(false);

    useAuthStore.setState({ token: null, expiresAt: Date.now() + 1000 });
    expect(store().isSessionValid()).toBe(false);
  });

  it("clearing the session wipes it and remembers why for the login page", () => {
    store().setSession(makeUser(), "t", allModules());
    store().clearAuth("expired");

    expect(store()).toMatchObject({ token: null, user: null, refreshToken: null });
    expect(sessionStorage.getItem(SIGN_OUT_REASON_KEY)).toBe("expired");

    store().setSession(makeUser(), "t", allModules());
    expect(sessionStorage.getItem(SIGN_OUT_REASON_KEY)).toBeNull();
  });

  it("survives a sessionStorage that throws (private mode, blocked storage)", () => {
    const setItem = vi.spyOn(sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const removeItem = vi.spyOn(sessionStorage, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => store().setSession(makeUser(), "t", allModules())).not.toThrow();
    removeItem.mockRestore();
    expect(() => store().clearAuth("signedOut")).not.toThrow();
    setItem.mockRestore();
  });
});

describe("hasAllBranchAccess", () => {
  it("uses the role setting, falling back to 'no branch' for old sessions", () => {
    expect(hasAllBranchAccess(null)).toBe(false);
    expect(hasAllBranchAccess(makeUser("staff", { allBranchAccess: true, branchId: "b" }))).toBe(true);
    expect(hasAllBranchAccess({ ...makeUser("admin"), allBranchAccess: undefined as unknown as boolean })).toBe(true);
    expect(hasAllBranchAccess({ ...makeUser("teacher"), allBranchAccess: undefined as unknown as boolean })).toBe(false);
  });
});
