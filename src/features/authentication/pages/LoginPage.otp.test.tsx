import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./LoginPage";
import { getAuthMethods, requestOtp, resendOtp, selectOtpAccount, verifyOtp } from "../otpApi";
import { useAuthStore } from "@/store/authStore";
import { makeUser, renderWithProviders, signOut } from "@/test/utils";

vi.mock("../api", () => ({ login: vi.fn() }));
vi.mock("../otpApi", () => ({
  getAuthMethods: vi.fn(),
  requestOtp: vi.fn(),
  resendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  selectOtpAccount: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

// Made-up test values: every API call is mocked, nothing leaves the test.
const EMAIL = "someone@example.test";
const CODE = "482913";
const challenge = (overrides: Record<string, unknown> = {}) => ({
  challengeId: "c1",
  expiresInSeconds: 300,
  resendAfterSeconds: 60,
  maskedDestination: "s***@example.test",
  ...overrides,
});
const session = () => ({ user: makeUser("teacher", { name: "Meera Rao" }), token: "t", refreshToken: "r", permissions: {} }) as never;

function renderLogin() {
  return renderWithProviders(<LoginPage />, { route: "/login", path: "/login", routes: [{ path: "/dashboard", element: <p>Dashboard page</p> }] });
}

describe("LoginPage - sign in with a code", () => {
  beforeEach(() => {
    signOut();
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getAuthMethods).mockResolvedValue({ password: true, otpEmail: true, otpMobile: true, otpWhatsApp: true });
  });

  it("offers only the password form while the server has codes switched off", async () => {
    vi.mocked(getAuthMethods).mockResolvedValue({ password: true, otpEmail: false, otpMobile: false, otpWhatsApp: false });
    renderLogin();

    expect(await screen.findByLabelText("Password")).toBeInTheDocument();
    await waitFor(() => expect(getAuthMethods).toHaveBeenCalled());
    expect(screen.queryByRole("radiogroup", { name: "Sign-in method" })).not.toBeInTheDocument();
  });

  it("shows every method, keeps password as the default, and remembers the last choice", async () => {
    const user = userEvent.setup();
    const { unmount } = renderLogin();

    const group = await screen.findByRole("radiogroup", { name: "Sign-in method" });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "Password" })).toBeChecked();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Mobile OTP" }));
    expect(await screen.findByLabelText("Mobile number")).toBeInTheDocument();
    unmount();

    renderLogin();
    expect(await screen.findByLabelText("Mobile number")).toBeInTheDocument();
  });

  it("sends the code on WhatsApp for the same kind of number", async () => {
    const user = userEvent.setup();
    vi.mocked(requestOtp).mockResolvedValue({ ...challenge(), maskedDestination: "+91 *****0881" });
    renderLogin();

    await user.click(await screen.findByRole("radio", { name: "WhatsApp OTP" }));
    await user.type(screen.getByLabelText("Mobile number"), "98960 40881");
    expect(screen.getByText(/on WhatsApp if this number is registered/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /send code/i }));

    expect(requestOtp).toHaveBeenCalledWith("whatsapp", "98960 40881");
    expect(await screen.findByText(/on WhatsApp\. It expires/i)).toBeInTheDocument();
  });

  it("hides the WhatsApp option when the server does not offer it", async () => {
    vi.mocked(getAuthMethods).mockResolvedValue({ password: true, otpEmail: true, otpMobile: true, otpWhatsApp: false });
    renderLogin();

    await screen.findByRole("radiogroup", { name: "Sign-in method" });
    expect(screen.queryByRole("radio", { name: "WhatsApp OTP" })).not.toBeInTheDocument();
  });

  it("signs in with an emailed code: send, count down, verify", async () => {
    const user = userEvent.setup();
    vi.mocked(requestOtp).mockResolvedValue(challenge());
    vi.mocked(verifyOtp).mockResolvedValue({ kind: "session", session: session() });
    renderLogin();

    await user.click(await screen.findByRole("radio", { name: "Email OTP" }));
    await user.type(screen.getByLabelText("Email address"), EMAIL);
    await user.click(screen.getByRole("button", { name: /send code/i }));

    expect(requestOtp).toHaveBeenCalledWith("email", EMAIL);
    expect(await screen.findByText(/s\*\*\*@example\.test/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend code in 1:0\d/i })).toBeDisabled();
    const verify = screen.getByRole("button", { name: /verify and sign in/i });
    expect(verify).toBeDisabled();

    await user.type(screen.getByLabelText("Verification code"), `${CODE}999`);
    expect(screen.getByLabelText("Verification code")).toHaveValue(CODE); // digits only, six at most
    await user.click(verify);

    expect(verifyOtp).toHaveBeenCalledWith("c1", CODE);
    await waitFor(() => expect(useAuthStore.getState().user?.name).toBe("Meera Rao"));
    expect(await screen.findByText("Dashboard page", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("explains a wrong or expired code and lets the person try again", async () => {
    const user = userEvent.setup();
    vi.mocked(requestOtp).mockResolvedValue(challenge());
    vi.mocked(verifyOtp).mockRejectedValueOnce(new Error("That code is incorrect or has expired.")).mockResolvedValueOnce({ kind: "session", session: session() });
    renderLogin();

    await user.click(await screen.findByRole("radio", { name: "Email OTP" }));
    await user.type(screen.getByLabelText("Email address"), EMAIL);
    await user.click(screen.getByRole("button", { name: /send code/i }));
    await user.type(await screen.findByLabelText("Verification code"), "111111");
    await user.click(screen.getByRole("button", { name: /verify and sign in/i }));

    expect(await screen.findByText("That code is incorrect or has expired.")).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
    await user.clear(screen.getByLabelText("Verification code"));
    expect(screen.queryByText("That code is incorrect or has expired.")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Verification code"), CODE);
    await user.click(screen.getByRole("button", { name: /verify and sign in/i }));
    await waitFor(() => expect(useAuthStore.getState().user).not.toBeNull());
  });

  it("lets the person change the address, keeping what they typed", async () => {
    const user = userEvent.setup();
    vi.mocked(requestOtp).mockResolvedValue(challenge());
    renderLogin();

    await user.click(await screen.findByRole("radio", { name: "Email OTP" }));
    await user.type(screen.getByLabelText("Email address"), EMAIL);
    await user.click(screen.getByRole("button", { name: /send code/i }));
    await user.click(await screen.findByRole("button", { name: "Change email address" }));

    expect(screen.getByLabelText("Email address")).toHaveValue(EMAIL);
    expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
  });

  it("enables resend when the wait is over and swaps in the fresh challenge", async () => {
    const user = userEvent.setup();
    vi.mocked(requestOtp).mockResolvedValue(challenge({ resendAfterSeconds: 1 }));
    vi.mocked(resendOtp).mockResolvedValue(challenge({ challengeId: "c2", resendAfterSeconds: 60 }));
    vi.mocked(verifyOtp).mockResolvedValue({ kind: "session", session: session() });
    renderLogin();

    await user.click(await screen.findByRole("radio", { name: "Email OTP" }));
    await user.type(screen.getByLabelText("Email address"), EMAIL);
    await user.click(screen.getByRole("button", { name: /send code/i }));
    const resend = await screen.findByRole("button", { name: "Resend code" }, { timeout: 3000 });
    await user.click(resend);

    expect(resendOtp).toHaveBeenCalledWith("c1");
    expect(await screen.findByRole("button", { name: /resend code in/i })).toBeDisabled();
    await user.type(screen.getByLabelText("Verification code"), CODE);
    await user.click(screen.getByRole("button", { name: /verify and sign in/i }));
    expect(verifyOtp).toHaveBeenCalledWith("c2", CODE);
  });

  it("rejects an impossible address or number before asking the server", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole("radio", { name: "Mobile OTP" }));
    await user.type(screen.getByLabelText("Mobile number"), "12");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByText("Enter a valid mobile number")).toBeInTheDocument();
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it("asks which account to use when a number is shared, then signs in the chosen one", async () => {
    const user = userEvent.setup();
    vi.mocked(requestOtp).mockResolvedValue(challenge({ maskedDestination: "+91*******881" }));
    vi.mocked(verifyOtp).mockResolvedValue({
      kind: "select",
      selectionToken: "tok",
      accounts: [
        { userId: "u1", displayName: "Asha Nair", schoolName: "Green Valley", roleLabel: "Parent" },
        { userId: "u2", displayName: "Ravi Nair", schoolName: "Green Valley", roleLabel: "Student" },
      ],
    });
    vi.mocked(selectOtpAccount).mockResolvedValue(session());
    renderLogin();

    await user.click(await screen.findByRole("radio", { name: "Mobile OTP" }));
    await user.type(screen.getByLabelText("Mobile number"), "98960 40881");
    await user.click(screen.getByRole("button", { name: /send code/i }));
    expect(requestOtp).toHaveBeenCalledWith("mobile", "98960 40881");
    await user.type(await screen.findByLabelText("Verification code"), CODE);
    await user.click(screen.getByRole("button", { name: /verify and sign in/i }));

    expect(await screen.findByText("Ravi Nair")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Asha Nair/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Ravi Nair/ }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(selectOtpAccount).toHaveBeenCalledWith("tok", "u2");
    await waitFor(() => expect(useAuthStore.getState().user?.name).toBe("Meera Rao"));
  });

  it("falls back to the password form if the server cannot be asked what it offers", async () => {
    vi.mocked(getAuthMethods).mockResolvedValue({ password: true, otpEmail: false, otpMobile: false, otpWhatsApp: false });
    localStorage.setItem("sms.signInMethod", "email"); // a remembered choice that is no longer on offer
    renderLogin();

    expect(await screen.findByLabelText("Password")).toBeInTheDocument();
  });
});
