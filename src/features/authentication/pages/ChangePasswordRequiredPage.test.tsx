import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import ChangePasswordRequiredPage from "./ChangePasswordRequiredPage";
import { authHttpClient } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { apiError, renderWithProviders, signIn, stubClient } from "@/test/utils";

function renderPage() {
  return renderWithProviders(<ChangePasswordRequiredPage />, { route: "/change-password", routes: [{ path: "/login", element: <p>login page</p> }] });
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm: string) {
  await user.type(screen.getByLabelText("Temporary password"), current);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", { name: "Update password" }));
}

describe("ChangePasswordRequiredPage", () => {
  beforeEach(() => {
    signIn("teacher");
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
  });

  it("changes the password, ends the session and sends the user to sign in again", async () => {
    const calls = stubClient(authHttpClient, { "POST /api/auth/change-password": {} });
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user, "Temp#1234", "NewPassw0rd!", "NewPassw0rd!");

    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(calls[0].body).toEqual({ currentPassword: "Temp#1234", newPassword: "NewPassw0rd!" });
    expect(useAuthStore.getState().token).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Password updated. Sign in with your new password.");
  });

  it("validates the form before calling the server", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user, "Temp#1234", "short", "different");

    expect(await screen.findByText("Must be at least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(useAuthStore.getState().token).not.toBeNull();
  });

  it("shows the server's reason when the temporary password is wrong", async () => {
    stubClient(authHttpClient, {
      "POST /api/auth/change-password": () => {
        throw apiError(400, { title: "Current password is incorrect" });
      },
    });
    const user = userEvent.setup();
    renderPage();

    await fillAndSubmit(user, "wrong", "NewPassw0rd!", "NewPassw0rd!");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Current password is incorrect"));
    expect(useAuthStore.getState().token).not.toBeNull();
  });

  it("lets the user sign out instead", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
