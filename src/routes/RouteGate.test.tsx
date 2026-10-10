import { screen } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore";
import { allModules, renderWithProviders, signIn, signOut } from "@/test/utils";
import RouteGate from "./RouteGate";

const page = (
  <RouteGate>
    <h1>The page</h1>
  </RouteGate>
);
const at = (route: string) => renderWithProviders(page, { route });

describe("RouteGate: a direct address follows the same rule as the menu", () => {
  afterEach(signOut);

  it.each(["/library", "/transport", "/hostel", "/inventory", "/visitors", "/health"])("lets an administrator whose plan includes %s open it", (path) => {
    signIn("admin");
    at(path);
    expect(screen.getByRole("heading", { name: "The page" })).toBeInTheDocument();
  });

  it.each([
    ["/transport", "transport"],
    ["/hostel", "hostel"],
    ["/inventory", "inventory"],
    ["/visitors", "visitors"],
    ["/health", "health"],
    ["/fees", "fees"],
    ["/payroll", "payroll"],
    ["/accounting", "accounting"],
  ] as const)("keeps %s closed when the school's plan or the role leaves %s out, even if the address is typed", (path, key) => {
    signIn("admin", {}, { ...allModules(), [key]: false });
    at(path);
    expect(screen.queryByRole("heading", { name: "The page" })).not.toBeInTheDocument();
    expect(screen.getByText("This isn't available to you")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("also covers detail screens of a module, not only its main page", () => {
    signIn("teacher", {}, { ...allModules(), students: false });
    at("/students/abc-123");
    expect(screen.getByText("This isn't available to you")).toBeInTheDocument();
  });

  it("opens only the modules the role has: a teacher without Transport cannot, one with it can", () => {
    signIn("teacher", {}, { ...allModules(), transport: false });
    const { unmount } = at("/transport");
    expect(screen.getByText("This isn't available to you")).toBeInTheDocument();
    unmount();
    signOut();

    signIn("teacher", {}, { ...allModules(), transport: true });
    at("/transport");
    expect(screen.getByRole("heading", { name: "The page" })).toBeInTheDocument();
  });

  it("keeps staff-only and student-only screens to their audience", () => {
    signIn("parent");
    const { unmount } = at("/online-exams/question-bank");
    expect(screen.getByText("This isn't available to you")).toBeInTheDocument();
    unmount();
    signOut();

    signIn("teacher");
    at("/online-exams/my");
    expect(screen.getByText("This isn't available to you")).toBeInTheDocument();
  });

  it("keeps the platform screens to the platform administrator", () => {
    signIn("admin");
    at("/admin/azure");
    expect(screen.getByText("This isn't available to you")).toBeInTheDocument();
    expect(screen.getByText(/only for the platform administrator/)).toBeInTheDocument();
  });

  it("leaves screens that are not module-bound, and screens before permissions load, alone", () => {
    signIn("student");
    at("/notifications");
    expect(screen.getByRole("heading", { name: "The page" })).toBeInTheDocument();
    signOut();

    signIn("teacher");
    useAuthStore.setState({ modulePermissions: null });
    renderWithProviders(page, { route: "/transport" });
    expect(screen.getAllByRole("heading", { name: "The page" }).length).toBeGreaterThan(0);
  });
});
