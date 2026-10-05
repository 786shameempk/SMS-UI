import * as auth from "./api";
import * as users from "@/features/administration/users/api";
import * as branches from "@/features/administration/branches/api";
import * as roles from "@/features/administration/roles/api";
import { authHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const apiUser = (overrides: Record<string, unknown> = {}) => ({
  id: "u1",
  email: "asha@school.test",
  firstName: "Asha",
  lastName: "Nair",
  tenantId: "tenant-a",
  branchId: "tenant-a-main",
  allBranchAccess: false,
  roles: ["Teacher"],
  permissions: ["module.students", "module.attendance", "students.view"],
  ...overrides,
});

describe("authentication api", () => {
  it("login maps the user, role and module permissions", async () => {
    const calls = stubClient(authHttpClient, {
      "POST /api/auth/login": { accessToken: "a", refreshToken: "r", accessTokenExpiresAt: "", user: apiUser() },
    });

    const result = await auth.login({ email: "asha@school.test", password: "x", rememberMe: true });

    expect(calls[0].body).toEqual({ email: "asha@school.test", password: "x", subdomain: null });
    expect(result.user).toMatchObject({ name: "Asha Nair", role: "teacher", tenantId: "tenant-a", allBranchAccess: false });
    expect(result.permissions).toMatchObject({ students: true, attendance: true, fees: false });
    expect([result.token, result.refreshToken]).toEqual(["a", "r"]);
  });

  it("sends the school subdomain the page was opened on so the server can check membership", async () => {
    const original = window.location;
    Object.defineProperty(window, "location", { value: { ...original, hostname: "greenvalley.sms-schoolsphere.com" }, writable: true, configurable: true });
    try {
      const calls = stubClient(authHttpClient, {
        "POST /api/auth/login": { accessToken: "a", refreshToken: "r", accessTokenExpiresAt: "", user: apiUser() },
      });

      await auth.login({ email: "asha@school.test", password: "x" });

      expect(calls[0].body).toMatchObject({ subdomain: "greenvalley" });
    } finally {
      Object.defineProperty(window, "location", { value: original, writable: true, configurable: true });
    }
  });

  it("treats unknown roles as a school's custom staff role", async () => {
    stubClient(authHttpClient, {
      "POST /api/auth/login": { accessToken: "a", refreshToken: "r", accessTokenExpiresAt: "", user: apiUser({ roles: ["custom-warden"], lastName: "" }) },
    });

    const { user } = await auth.login({ email: "w@x.test", password: "x" });

    expect([user.role, user.name]).toEqual(["staff", "Asha"]);
  });

  it("matches built-in roles case-insensitively", async () => {
    stubClient(authHttpClient, {
      "POST /api/auth/login": { accessToken: "a", refreshToken: "r", accessTokenExpiresAt: "", user: apiUser({ roles: ["SUPERADMIN"] }) },
    });

    expect((await auth.login({ email: "x", password: "y" })).user.role).toBe("superAdmin");
  });

  it("turns API failures into readable errors", async () => {
    vi.spyOn(authHttpClient, "post").mockRejectedValue(apiError(401, {}));
    await expect(auth.login({ email: "x", password: "bad" })).rejects.toThrow("Invalid email or password");
    await expect(auth.resetPassword("x", "t", "p")).rejects.toThrow("This reset link is invalid or has expired");
    await expect(auth.changePassword("x", "old", "new")).rejects.toThrow("Current password is incorrect");
    await expect(auth.requestPasswordReset("x")).rejects.toThrow("Something went wrong");
  });

  it("password flows post to the right endpoints", async () => {
    const calls = stubClient(authHttpClient, {
      "POST /api/auth/forgot-password": null,
      "POST /api/auth/reset-password": null,
      "POST /api/auth/change-password": null,
    });

    expect((await auth.requestPasswordReset("a@x.test")).message).toMatch(/reset link/);
    expect((await auth.resetPassword("a@x.test", "tok", "New#Pass1")).message).toBe("Your password has been reset");
    expect((await auth.changePassword("a@x.test", "Old#1", "New#1")).message).toBe("Password updated successfully");
    expect(calls.map((c) => c.body)).toEqual([
      { email: "a@x.test" },
      { email: "a@x.test", token: "tok", newPassword: "New#Pass1" },
      { currentPassword: "Old#1", newPassword: "New#1" },
    ]);
  });

  it("lists and revokes the caller's sessions and devices", async () => {
    const calls = stubClient(authHttpClient, {
      "GET /api/account/sessions": [{ id: "s1", device: "Laptop", browser: "Chrome", ipAddress: "1.2.3.4", createdAt: "2026-09-01", expiresAt: "2026-10-01", isCurrent: true }],
      "DELETE /api/account/sessions/s1": null,
      "GET /api/account/devices": [{ id: "d1", name: "Pixel", type: "mobile", os: "Android", firstSeenAt: "2026-08-01", lastUsedAt: "2026-09-01" }],
      "DELETE /api/account/devices/d1": null,
    });

    expect(await auth.listSessions()).toEqual([
      { id: "s1", device: "Laptop", browser: "Chrome", location: "—", ipAddress: "1.2.3.4", lastActiveAt: "2026-09-01", isCurrent: true },
    ]);
    expect((await auth.revokeSession("s1")).message).toBe("Session signed out");
    expect((await auth.listDevices())[0]).toMatchObject({ name: "Pixel", trustedAt: "2026-08-01" });
    expect((await auth.revokeDevice("d1")).message).toBe("Device signed out");
    expect(calls).toHaveLength(4);
  });
});

describe("administration: users", () => {
  const apiSchoolUser = {
    id: "u1",
    tenantId: null,
    branchId: null,
    name: "Asha",
    email: "a@x.test",
    phone: null,
    roleId: null,
    roleKey: null,
    department: null,
    status: "active",
    avatarUrl: "api/user-files/u1?sig=1",
    createdAt: "2026-01-01",
    lastLoginAt: null,
    mfaEnabled: false,
    preferences: { theme: "light" },
  };
  const values = { branchId: "b1", name: "Asha", email: "a@x.test", phone: "", roleId: "r1", department: "" } as never;

  it("maps users with absolute avatar links and empty optional fields", async () => {
    stubClient(authHttpClient, { "GET /api/school-users": [apiSchoolUser] });

    const [user] = await users.listUsers();

    expect(user).toMatchObject({ tenantId: "", roleId: "", phone: undefined, department: undefined });
    expect(user.avatarUrl).toMatch(/^https?:\/\/.+\/api\/user-files\/u1\?sig=1$/);
  });

  it("create returns the temporary password; edits send blanks as null", async () => {
    const calls = stubClient(authHttpClient, {
      "POST /api/school-users": { user: apiSchoolUser, temporaryPassword: "Temp#123" },
      "PUT /api/school-users/u1": apiSchoolUser,
      "PUT /api/school-users/u1/status": apiSchoolUser,
      "PUT /api/school-users/u1/preferences": apiSchoolUser,
      "PUT /api/school-users/u1/avatar": apiSchoolUser,
      "PUT /api/school-users/u1/mfa": apiSchoolUser,
      "POST /api/school-users/u1/reset-password": { tempPassword: "Temp#456" },
      "DELETE /api/school-users/u1": null,
    });

    expect((await users.createUser(values)).tempPassword).toBe("Temp#123");
    await users.updateUser("u1", values);
    await users.setUserStatus("u1", "inactive" as never);
    await users.updateUserPreferences("u1", { theme: "dark" } as never);
    await users.updateUserAvatar("u1", null);
    await users.setUserMfaEnabled("u1", true);
    expect(await users.resetUserPassword("u1")).toEqual({ tempPassword: "Temp#456" });
    await users.deleteUser("u1");

    expect(calls[0].body).toEqual({ branchId: "b1", name: "Asha", email: "a@x.test", phone: null, roleId: "r1", department: null });
    expect(calls.slice(2, 6).map((c) => c.body)).toEqual([{ status: "inactive" }, { theme: "dark" }, { avatarUrl: null }, { mfaEnabled: true }]);
  });

  it("reads another user's history, sessions and devices", async () => {
    stubClient(authHttpClient, {
      "GET /api/school-users/u1/login-history": [{ id: "h1", at: "2026-09-01", success: true }],
      "GET /api/school-users/u1/sessions": [],
      "DELETE /api/school-users/u1/sessions/s1": null,
      "GET /api/school-users/u1/devices": [],
      "DELETE /api/school-users/u1/devices/d1": null,
    });

    expect((await users.listUserLoginHistory("u1"))[0]).toMatchObject({ id: "h1", location: "—" });
    expect(await users.listUserSessions("u1")).toEqual([]);
    expect((await users.revokeUserSession("u1", "s1")).message).toBe("Session signed out");
    expect(await users.listUserDevices("u1")).toEqual([]);
    expect((await users.revokeUserDevice("u1", "d1")).message).toBe("Device signed out");
  });

  it("surfaces the server's validation message", async () => {
    vi.spyOn(authHttpClient, "get").mockRejectedValue(apiError(403, { title: "Not allowed" }));
    await expect(users.listUsers()).rejects.toThrow("Not allowed");
  });
});

describe("administration: branches", () => {
  const apiBranch = { id: "tenant-a-main", tenantId: "tenant-a", name: "Main", code: "MAIN", address: null, phone: null, status: "Active", createdAt: "2026-01-01" };

  it("maps status both ways and url-encodes ids", async () => {
    const calls = stubClient(authHttpClient, {
      "GET /api/branches": [apiBranch],
      "POST /api/branches": { ...apiBranch, status: "Inactive" },
      "PUT /api/branches/tenant%20a": apiBranch,
      "DELETE /api/branches/tenant%20a": null,
    });

    expect((await branches.listBranches())[0]).toMatchObject({ status: "active", address: undefined });
    const created = await branches.createBranch({ name: "North", code: "N", address: "", phone: "99", status: "inactive" });
    await branches.updateBranch("tenant a", { name: "North", code: "N", address: "Road", phone: "", status: "active" });
    await branches.deleteBranch("tenant a");

    expect(created.status).toBe("inactive");
    expect(calls[1].body).toEqual({ name: "North", code: "N", address: null, phone: "99", status: "Inactive" });
    expect(calls[2].body).toMatchObject({ address: "Road", phone: null, status: "Active" });
  });
});

describe("administration: roles", () => {
  const apiRole = { id: "r1", tenantId: null, key: "custom-x", name: "Warden", description: "", isSystem: false, grantsAllBranchAccess: false, createdAt: "", userCount: 3 };

  it("covers roles, the permission matrix, policies and feature toggles", async () => {
    const calls = stubClient(authHttpClient, {
      "GET /api/school-roles": [apiRole],
      "POST /api/school-roles": apiRole,
      "PUT /api/school-roles/r1": apiRole,
      "DELETE /api/school-roles/r1": null,
      "GET /api/school-roles/matrix/modules": { restricted: true, planName: "Basic", modules: ["students"] },
      "GET /api/school-roles/matrix": { r1: ["students.view"] },
      "PUT /api/school-roles/r1/matrix/students.view%2Fall": null,
      "GET /api/school-roles/policies": [],
      "POST /api/school-roles/policies": { id: "p1" },
      "PUT /api/school-roles/policies/p1": { id: "p1" },
      "PUT /api/school-roles/policies/p1/enabled": { id: "p1", enabled: false },
      "DELETE /api/school-roles/policies/p1": null,
      "GET /api/school-roles/feature-toggles": [{ id: "f1", enabled: true }],
      "PUT /api/school-roles/feature-toggles/f1": { id: "f1", enabled: false },
    });

    expect((await roles.listRoles())[0]).toMatchObject({ tenantId: "", name: "Warden" });
    expect(await roles.getRoleUserCounts()).toEqual({ r1: 3 });
    await roles.createRole({ name: "Warden" } as never);
    await roles.updateRole("r1", { name: "Warden" } as never);
    await roles.deleteRole("r1");
    expect((await roles.listPermissions()).length).toBeGreaterThan(10);
    expect((await roles.getMatrixModules()).planName).toBe("Basic");
    expect(await roles.setRolePermission("r1", "students.view/all", true)).toEqual({ r1: ["students.view"] });
    expect(await roles.listPolicies()).toEqual([]);
    await roles.createPolicy({ name: "p" } as never);
    await roles.updatePolicy("p1", { name: "p" } as never);
    expect((await roles.setPolicyEnabled("p1", false)).enabled).toBe(false);
    await roles.deletePolicy("p1");
    expect(await roles.listFeatureToggles()).toHaveLength(1);
    expect((await roles.setFeatureToggle("f1", false)).enabled).toBe(false);

    expect(calls.find((c) => c.url.includes("matrix/students"))?.body).toEqual({ granted: true });
  });
});
