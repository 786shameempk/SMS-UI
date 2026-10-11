import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, signIn as signInToSchool, signOut as signOutOfSchool } from "@/test/utils";
import { setOfficeToken } from "./api/http";
import { OFFICE_NAV, visibleNav } from "./navigation";
import { OFFICE_PAGE_PATHS } from "./pages/registry";
import AdminLoginPage from "./pages/AdminLoginPage";
import OfficeLayout, { OfficeGuard } from "./components/OfficeLayout";
import { useOfficeStore } from "./store";
import type { OfficeAuthResult, OfficeUser } from "./types";

const auth = vi.hoisted(() => ({
  officeLogin: vi.fn(),
  verifyMfa: vi.fn(),
  changeRequiredPassword: vi.fn(),
  beginMfaSetupFromChallenge: vi.fn(),
  confirmMfaSetupFromChallenge: vi.fn(),
  requestPasswordReset: vi.fn(),
}));
vi.mock("./api/auth", () => auth);

const refresh = vi.hoisted(() => vi.fn());
vi.mock("./api/http", async (orig) => ({ ...(await orig<typeof import("./api/http")>()), refreshOfficeSession: refresh }));

const user = (permissions: string[], over: Partial<OfficeUser> = {}): OfficeUser => ({
  id: "u1", email: "ops@office.test", displayName: "Ops Person", roleId: "r1", role: "Operations Admin", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false, ...over,
});

const result = (status: OfficeAuthResult["status"], over: Partial<OfficeAuthResult> = {}): OfficeAuthResult => ({
  status, accessToken: status === "authenticated" ? "access" : null, expiresAt: null, challengeToken: status === "authenticated" ? null : "challenge", user: status === "authenticated" ? user(["users.view"]) : null, ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  setOfficeToken(null);
  useOfficeStore.setState({ status: "signedOut", user: null, notice: null });
});
afterEach(signOutOfSchool);

describe("office menu", () => {
  it("lists only built screens the user's permissions open", () => {
    const names = (perms: string[]) => visibleNav(perms, OFFICE_PAGE_PATHS).map((n) => n.to);
    expect(names([])).toEqual(["security"]); // everyone gets their own security page
    expect(names(["users.view"])).toEqual(["users", "roles", "security"]);
    expect(names(["audit.view", "users.view"])).toEqual(["users", "roles", "audit", "security"]);
    expect(names(["payments.verify"])).toEqual(["security"]); // no screen for it, or no permission, never a dead link
  });

  it("only offers menu entries whose permission exists in the office permission set", () => {
    expect(OFFICE_NAV.every((n) => n.permission === "*" || /^[a-z]+\.[a-z.]+$/.test(n.permission))).toBe(true);
    expect(new Set(OFFICE_NAV.map((n) => n.to)).size).toBe(OFFICE_NAV.length);
  });
});

describe("office session store", () => {
  it("keeps the access token in memory only and never writes the session to browser storage", () => {
    useOfficeStore.getState().signIn(result("authenticated"));
    expect(useOfficeStore.getState().status).toBe("signedIn");
    expect(JSON.stringify({ ...localStorage })).not.toContain("access");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("access");
  });

  it("restores a session from the refresh cookie, or signs out when there is none", async () => {
    refresh.mockResolvedValueOnce(result("authenticated"));
    await useOfficeStore.getState().restore();
    expect(useOfficeStore.getState().status).toBe("signedIn");

    useOfficeStore.setState({ status: "loading", user: null });
    refresh.mockResolvedValueOnce(null);
    await useOfficeStore.getState().restore();
    expect(useOfficeStore.getState().status).toBe("signedOut");
  });

  it("answers permission questions from the signed-in user only", () => {
    useOfficeStore.getState().signIn(result("authenticated", { user: user(["audit.view"]) }));
    expect(useOfficeStore.getState().has("audit.view")).toBe(true);
    expect(useOfficeStore.getState().has("users.manage")).toBe(false);
  });
});

describe("the office is separate from the school session", () => {
  it("does not treat a signed-in school administrator as an office user", async () => {
    signInToSchool("admin");
    refresh.mockResolvedValue(null);
    renderWithProviders(
      <OfficeGuard>
        <p>office secrets</p>
      </OfficeGuard>,
      { route: "/office", routes: [{ path: "/adminLogin", element: <p>office sign-in</p> }] },
    );
    expect(await screen.findByText("office sign-in")).toBeInTheDocument();
    expect(screen.queryByText("office secrets")).not.toBeInTheDocument();
  });

  it("shows the portal when an office session exists", async () => {
    refresh.mockResolvedValue(result("authenticated", { user: user(["users.view"]) }));
    useOfficeStore.setState({ status: "loading" });
    renderWithProviders(
      <OfficeGuard>
        <p>office home</p>
      </OfficeGuard>,
      { route: "/office" },
    );
    expect(await screen.findByText("office home")).toBeInTheDocument();
  });

  it("builds the sidebar from the user's permissions", () => {
    useOfficeStore.setState({ status: "signedIn", user: user(["users.view", "audit.view"]) });
    renderWithProviders(<OfficeLayout />, { route: "/office/users" });
    const nav = screen.getByRole("navigation", { name: "Office navigation" });
    expect(nav).toHaveTextContent("Office Users");
    expect(nav).toHaveTextContent("Audit Logs");
    expect(nav).not.toHaveTextContent("Billing");
    expect(nav).not.toHaveTextContent("Subscription Plans");
  });
});

describe("/adminLogin", () => {
  const route = { route: "/adminLogin", routes: [{ path: "/office", element: <p>inside the office</p> }] };

  async function fillAndSubmit() {
    await userEvent.type(screen.getByLabelText("Email"), "ops@office.test");
    await userEvent.type(screen.getByLabelText("Password"), "Whatever-1234!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  }

  it("signs in and opens the office", async () => {
    refresh.mockResolvedValue(null);
    auth.officeLogin.mockResolvedValue(result("authenticated"));
    renderWithProviders(<AdminLoginPage />, { path: "/adminLogin", ...route });
    await fillAndSubmit();
    expect(await screen.findByText("inside the office")).toBeInTheDocument();
    expect(auth.officeLogin).toHaveBeenCalledWith("ops@office.test", "Whatever-1234!");
  });

  it("shows the server's message when sign-in fails, and stays on the form", async () => {
    refresh.mockResolvedValue(null);
    auth.officeLogin.mockRejectedValue(Object.assign(new Error("x"), { isAxiosError: true, response: { status: 401, data: { title: "Invalid email or password." } } }));
    renderWithProviders(<AdminLoginPage />, { path: "/adminLogin", ...route });
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("asks for the authenticator code when the account has MFA, then finishes the sign-in", async () => {
    refresh.mockResolvedValue(null);
    auth.officeLogin.mockResolvedValue(result("mfaRequired"));
    auth.verifyMfa.mockResolvedValue(result("authenticated"));
    renderWithProviders(<AdminLoginPage />, { path: "/adminLogin", ...route });
    await fillAndSubmit();
    await userEvent.type(await screen.findByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("inside the office")).toBeInTheDocument();
    expect(auth.verifyMfa).toHaveBeenCalledWith("challenge", "123456");
  });

  it("makes a forced password change before any session starts", async () => {
    refresh.mockResolvedValue(null);
    auth.officeLogin.mockResolvedValue(result("passwordChangeRequired"));
    auth.changeRequiredPassword.mockResolvedValue(result("authenticated"));
    renderWithProviders(<AdminLoginPage />, { path: "/adminLogin", ...route });
    await fillAndSubmit();
    await userEvent.type(await screen.findByLabelText("New password"), "A-Much-Better-Passphrase-9!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "A-Different-One-9!");
    await userEvent.click(screen.getByRole("button", { name: "Save password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("do not match");
    expect(auth.changeRequiredPassword).not.toHaveBeenCalled();
    expect(useOfficeStore.getState().status).toBe("signedOut");

    await userEvent.clear(screen.getByLabelText("Confirm new password"));
    await userEvent.type(screen.getByLabelText("Confirm new password"), "A-Much-Better-Passphrase-9!");
    await userEvent.click(screen.getByRole("button", { name: "Save password" }));
    await waitFor(() => expect(auth.changeRequiredPassword).toHaveBeenCalledWith("challenge", "A-Much-Better-Passphrase-9!"));
  });

  it("walks a new account through authenticator setup when MFA is required", async () => {
    refresh.mockResolvedValue(null);
    auth.officeLogin.mockResolvedValue(result("mfaSetupRequired"));
    auth.beginMfaSetupFromChallenge.mockResolvedValue({ secret: "JBSWY3DPEHPK3PXP", otpAuthUri: "otpauth://totp/x" });
    auth.confirmMfaSetupFromChallenge.mockResolvedValue(result("authenticated"));
    renderWithProviders(<AdminLoginPage />, { path: "/adminLogin", ...route });
    await fillAndSubmit();
    expect(await screen.findByTestId("mfa-secret")).toHaveTextContent("JBSWY3DPEHPK3PXP");
    await userEvent.type(screen.getByLabelText("6-digit code"), "654321");
    await userEvent.click(screen.getByRole("button", { name: /Turn on and sign in/ }));
    expect(await screen.findByText("inside the office")).toBeInTheDocument();
  });

  it("never reveals whether a reset address exists", async () => {
    refresh.mockResolvedValue(null);
    auth.requestPasswordReset.mockResolvedValue(undefined);
    renderWithProviders(<AdminLoginPage />, { path: "/adminLogin", ...route });
    await userEvent.click(screen.getByRole("button", { name: "Forgot your password?" }));
    await userEvent.type(screen.getByLabelText("Email"), "nobody@office.test");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("If that address belongs to an office account");
  });
});
