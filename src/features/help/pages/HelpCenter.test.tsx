import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import HelpArticlePage from "./HelpArticlePage";
import HelpHomePage from "./HelpHomePage";
import HelpModulePage from "./HelpModulePage";
import HelpRolePage from "./HelpRolePage";

vi.mock("virtual:help-catalog", async () => ({ default: (await import("../testCatalog")).TEST_CATALOG }));

const perms = (...on: string[]) => Object.fromEntries(on.map((k) => [k, true])) as unknown as ModulePermissions;

beforeEach(() => localStorage.clear());
afterEach(signOut);

describe("Help Center home", () => {
  it("shows the public guide to someone who is not signed in, with no member or admin articles", () => {
    renderWithProviders(<HelpHomePage />, { route: "/help" });

    expect(screen.getByRole("heading", { level: 1, name: "Help Center" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download the PDF manual/ })).toHaveAttribute("href", "/help/school-sphere-user-manual.pdf");
    expect(screen.getAllByText("Add a student").length).toBeGreaterThan(0);
    expect(screen.queryByText("Record a fee payment")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit the permission matrix")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask School AI" })).not.toBeInTheDocument();
  });

  it("searches as you type and shows a helpful empty state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpHomePage />, { route: "/help" });

    await user.type(screen.getByRole("searchbox", { name: "Search the Help Center" }), "register guardian");
    const results = await screen.findByRole("list", { name: /result/ });
    expect(within(results).getByText("Add a student")).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search the Help Center" }));
    await user.type(screen.getByRole("searchbox", { name: "Search the Help Center" }), "zebra");
    expect(await screen.findByText("No articles match “zebra”")).toBeInTheDocument();
  });

  it("only searches what the reader may see", async () => {
    const user = userEvent.setup();
    signIn("teacher", {}, perms("students"));
    renderWithProviders(<HelpHomePage />, { route: "/help?q=permission+matrix" });
    expect(await screen.findByText(/No articles match/)).toBeInTheDocument();
    signOut();

    signIn("admin", {}, perms("administration"));
    renderWithProviders(<HelpHomePage />, { route: "/help?q=permission+matrix" });
    expect(await screen.findAllByText("Edit the permission matrix")).not.toHaveLength(0);
    void user;
  });

  it("offers Ask School AI to signed-in users and remembers recently viewed articles", async () => {
    signIn("accountant", {}, perms("fees"));
    localStorage.setItem("sms-help-recent", JSON.stringify(["fees-record-payment"]));
    renderWithProviders(<HelpHomePage />, { route: "/help" });

    expect(screen.getByRole("button", { name: "Ask School AI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recently viewed" })).toBeInTheDocument();
    expect(screen.getAllByText("Record a fee payment").length).toBeGreaterThan(0);
  });
});

describe("Help article", () => {
  const open = (id: string) => renderWithProviders(<HelpArticlePage />, { route: `/help/a/${id}`, path: "/help/a/:articleId" });

  it("shows the steps, the menu breadcrumb and related articles", () => {
    open("students-add");

    expect(screen.getByRole("heading", { level: 1, name: "Add a student" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Help Center");
    expect(screen.getByText("Open Students.")).toBeInTheDocument();
    const guardianLinks = screen.getAllByRole("link", { name: /Add a guardian/ });
    expect(guardianLinks.length).toBeGreaterThan(0);
    for (const link of guardianLinks) expect(link).toHaveAttribute("href", "/help/a/students-guardian");
  });

  it("tells a signed-out reader to sign in instead of linking to an app screen", () => {
    open("students-add");
    expect(screen.getByText("Sign in to open this screen.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open this screen/ })).not.toBeInTheDocument();
  });

  it("links straight to the screen when the reader may open it, and explains when not", () => {
    signIn("teacher", {}, perms("students"));
    const { unmount } = open("students-add");
    expect(screen.getByRole("link", { name: /Open this screen/ })).toHaveAttribute("href", "/students");
    unmount();

    signOut();
    signIn("teacher", {}, perms("homework"));
    open("students-add");
    expect(screen.queryByRole("link", { name: /Open this screen/ })).not.toBeInTheDocument();
    expect(screen.getByText(/not available to your account/)).toBeInTheDocument();
  });

  it("does not reveal an article the reader may not see", () => {
    signIn("teacher", {}, perms("students"));
    open("roles-matrix");
    expect(screen.getByText("This article is not available")).toBeInTheDocument();
    expect(screen.queryByText("Edit the permission matrix")).not.toBeInTheDocument();
  });

  it("says so for an article that does not exist", () => {
    open("nope");
    expect(screen.getByText("This article is not available")).toBeInTheDocument();
    expect(screen.getByText("It may have been renamed or removed.")).toBeInTheDocument();
  });

  it("remembers the answer to 'Was this helpful?'", async () => {
    const user = userEvent.setup();
    open("students-add");
    await user.click(screen.getByRole("button", { name: "Yes, this was helpful" }));
    expect(await screen.findByText("Thanks, glad it helped.")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("sms-help-feedback")!)).toEqual({ "students-add": "yes" });
  });

  it("records the visit for Recently viewed", () => {
    open("students-add");
    expect(JSON.parse(localStorage.getItem("sms-help-recent")!)).toEqual(["students-add"]);
  });

  it("offers previous and next articles within the module", () => {
    open("students-add");
    expect(screen.getByRole("link", { name: /Next.*Add a guardian/s })).toHaveAttribute("href", "/help/a/students-guardian");
  });
});

describe("Help module and role pages", () => {
  it("lists a module's articles with its menu path and who gets it by default", () => {
    renderWithProviders(<HelpModulePage />, { route: "/help/m/students", path: "/help/m/:moduleId" });
    expect(screen.getByRole("heading", { level: 1, name: "Students" })).toBeInTheDocument();
    expect(screen.getByText("Menu: Academics → Students")).toBeInTheDocument();
    expect(screen.getByText("Add a guardian")).toBeInTheDocument();
    expect(screen.getByText(/Available by default to:/).parentElement).toHaveTextContent("School administrator");
  });

  it("rejects a module that does not exist", () => {
    renderWithProviders(<HelpModulePage />, { route: "/help/m/unknown", path: "/help/m/:moduleId" });
    expect(screen.getByText("This part of the guide is not available")).toBeInTheDocument();
  });

  it("lists the articles written for a role, grouped by module", () => {
    renderWithProviders(<HelpRolePage />, { route: "/help/r/receptionist", path: "/help/r/:role" });
    expect(screen.getByRole("heading", { level: 1, name: /receptionist/i })).toBeInTheDocument();
    expect(screen.getByText("Add a student")).toBeInTheDocument();
    expect(screen.queryByText("Add a guardian")).not.toBeInTheDocument();
  });

  it("rejects an unknown role", () => {
    renderWithProviders(<HelpRolePage />, { route: "/help/r/wizard", path: "/help/r/:role" });
    expect(screen.getByText("That role is not in the guide")).toBeInTheDocument();
  });
});
