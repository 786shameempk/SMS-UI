import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./LoginPage";
import { login } from "../api";
import { SIGN_OUT_REASON_KEY, useAuthStore } from "@/store/authStore";
import { makeUser, renderWithProviders, signOut } from "@/test/utils";

vi.mock("../api", () => ({ login: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

// Made-up test values: the API call is mocked, nothing leaves the test.
const EMAIL = "someone@example.test";
const SECRET = "not-a-real-secret";

function renderLogin() {
  return renderWithProviders(<LoginPage />, { route: "/login", path: "/login", routes: [{ path: "/dashboard", element: <p>Dashboard page</p> }] });
}

describe("LoginPage", () => {
  beforeEach(() => signOut());

  it("keeps Sign In disabled until both fields are filled and validates the email", async () => {
    const user = userEvent.setup();
    renderLogin();
    const submit = screen.getByRole("button", { name: /sign in$/i });

    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), SECRET);
    await user.click(submit);

    expect(await screen.findByText("That doesn't look like a valid email")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in, stores the session and moves on to the dashboard", async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({ user: makeUser("teacher", { name: "Meera Rao" }), token: "t", refreshToken: "r", permissions: {} } as never);
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), `  ${EMAIL} `);
    await user.type(screen.getByLabelText("Password"), SECRET);
    await user.click(screen.getByRole("button", { name: /sign in$/i }));

    await waitFor(() => expect(useAuthStore.getState().user?.name).toBe("Meera Rao"));
    expect(login).toHaveBeenCalledWith({ email: EMAIL, password: SECRET, rememberMe: true });
    expect(await screen.findByText("Dashboard page", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("shows the server's error and clears it as soon as the user edits the form", async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockRejectedValue(new Error("Invalid email or password"));
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), EMAIL);
    await user.type(screen.getByLabelText("Password"), SECRET);
    await user.click(screen.getByRole("button", { name: /sign in$/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "x");
    await waitFor(() => expect(screen.queryByText("Invalid email or password")).not.toBeInTheDocument());
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderLogin();
    const password = screen.getByLabelText("Password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("explains an expired session", async () => {
    sessionStorage.setItem(SIGN_OUT_REASON_KEY, "expired");
    await act(async () => {
      renderLogin();
    });

    expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
  });
});
