import { act, screen } from "@testing-library/react";
import ProtectedRoute from "./ProtectedRoute";
import { useAuthStore } from "@/store/authStore";
import { renderWithProviders, signIn } from "@/test/utils";

function renderGuarded(route = "/students?page=2") {
  return renderWithProviders(
    <ProtectedRoute>
      <p>secret page</p>
    </ProtectedRoute>,
    { route, routes: [{ path: "/login", element: <p>login page</p> }] },
  );
}

describe("ProtectedRoute", () => {
  it("sends signed-out visitors to the login page", () => {
    useAuthStore.getState().clearAuth();
    renderGuarded();

    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("secret page")).not.toBeInTheDocument();
  });

  it("shows the page for a valid session", () => {
    signIn("teacher");
    renderGuarded();

    expect(screen.getByText("secret page")).toBeInTheDocument();
  });

  it("ends an expired session and redirects", () => {
    signIn("teacher");
    useAuthStore.setState({ expiresAt: Date.now() - 1000 });
    renderGuarded();

    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(sessionStorage.getItem("sms-signout-reason")).toBe("expired");
  });

  it("signs out when the session runs out while the page is open", () => {
    vi.useFakeTimers();
    signIn("teacher");
    useAuthStore.setState({ expiresAt: Date.now() + 5_000 });
    renderGuarded();
    expect(screen.getByText("secret page")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5_001));

    expect(screen.getByText("login page")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("re-checks the session when the tab regains focus", () => {
    signIn("teacher");
    useAuthStore.setState({ expiresAt: Date.now() + 60_000 });
    renderGuarded();
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 120_000);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(useAuthStore.getState().token).toBeNull();
  });
});
