import { screen } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import LandingPage from "./LandingPage";

// Whether the app lives on another origin than this page (the public site: sms-schoolsphere.com vs
// demo.sms-schoolsphere.com) - flipped per test.
const appOrigin = vi.hoisted(() => ({ other: false }));
vi.mock("@/lib/appUrl", () => ({
  get isAppOnOtherOrigin() {
    return appOrigin.other;
  },
  appHref: (path: string) => (appOrigin.other ? `https://demo.example.test${path}` : path),
}));

const dashboard = { path: "/dashboard", element: <h1>Dashboard page</h1> };

describe("LandingPage", () => {
  afterEach(() => {
    signOut();
    appOrigin.other = false;
  });

  it("sends a signed-in user to their dashboard when the app is on this origin", async () => {
    signIn("admin");
    renderWithProviders(<LandingPage />, { route: "/", path: "/", routes: [dashboard] });
    expect(await screen.findByRole("heading", { name: "Dashboard page" })).toBeInTheDocument();
  });

  it("stays on the landing page on the marketing host, even with a session stored there", async () => {
    appOrigin.other = true;
    signIn("admin");
    renderWithProviders(<LandingPage />, { route: "/", path: "/", routes: [dashboard] });
    expect(screen.queryByRole("heading", { name: "Dashboard page" })).not.toBeInTheDocument();
    // Sign In leaves for the app host.
    const signInLinks = await screen.findAllByRole("link", { name: "Sign In" });
    expect(signInLinks[0]).toHaveAttribute("href", "https://demo.example.test/login");
  });
});
