import { screen } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore";
import { allModules, renderWithProviders, signIn, signOut } from "@/test/utils";
import RequireModule from "./RequireModule";

const page = (
  <RequireModule module="aiFeatures">
    <h1>AI page</h1>
  </RequireModule>
);

describe("RequireModule", () => {
  afterEach(signOut);

  it("shows the page when the user has the module", () => {
    signIn("teacher");
    renderWithProviders(page);
    expect(screen.getByRole("heading", { name: "AI page" })).toBeInTheDocument();
  });

  it("explains instead of showing the page when the module is off", () => {
    signIn("teacher", {}, { ...allModules(), aiFeatures: false });
    renderWithProviders(page);
    expect(screen.queryByRole("heading", { name: "AI page" })).not.toBeInTheDocument();
    expect(screen.getByText("This module isn't available to you")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("allows the page while permissions are not loaded, like the nav", () => {
    signIn("teacher");
    useAuthStore.setState({ modulePermissions: null });
    renderWithProviders(page);
    expect(screen.getByRole("heading", { name: "AI page" })).toBeInTheDocument();
  });
});
