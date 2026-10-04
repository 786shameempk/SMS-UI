import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import LoginPage from "./LoginPage";

// Whether the marketing site lives on another origin (public site: demo.sms-schoolsphere.com -> sms-schoolsphere.com).
const site = vi.hoisted(() => ({ other: false }));
vi.mock("@/lib/appUrl", () => ({
  get isSiteOnOtherOrigin() {
    return site.other;
  },
  siteHref: (path: string) => (site.other ? `https://site.example.test${path}` : path),
  isAppOnOtherOrigin: false,
  appHref: (path: string) => path,
}));

describe("LoginPage - Back to website", () => {
  afterEach(() => {
    site.other = false;
  });

  it("links to the marketing host when it is a different site", () => {
    site.other = true;
    renderWithProviders(<LoginPage />, { route: "/login", path: "/login" });
    expect(screen.getByRole("link", { name: /Back to website/ })).toHaveAttribute("href", "https://site.example.test/");
  });

  it("stays an in-app link on a single origin (local dev)", () => {
    renderWithProviders(<LoginPage />, { route: "/login", path: "/login" });
    expect(screen.getByRole("link", { name: /Back to website/ })).toHaveAttribute("href", "/");
  });
});
