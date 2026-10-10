import { getRoute } from "@/app/routeRegistry";
import type { ModulePermissions } from "@/types/auth";
import { ANONYMOUS, canOpenRoute, canRead, canUseModule, explainNoAccess, visibleArticles, type Viewer } from "./access";
import { TEST_ARTICLES } from "./testCatalog";

const perms = (...on: string[]) => Object.fromEntries(on.map((k) => [k, true])) as unknown as ModulePermissions;
const as = (role: Viewer["role"], ...on: string[]): Viewer => ({ role, permissions: perms(...on) });
const route = (id: string) => getRoute(id)!;

describe("reading help", () => {
  it("lets anyone read public articles and only signed-in users read the rest", () => {
    expect(canRead("public", ANONYMOUS)).toBe(true);
    expect(canRead("member", ANONYMOUS)).toBe(false);
    expect(canRead("member", as("parent"))).toBe(true);
  });

  it("keeps administrator and platform articles from other roles", () => {
    expect(canRead("admin", as("teacher"))).toBe(false);
    expect(canRead("admin", as("principal"))).toBe(true);
    expect(canRead("admin", as("admin"))).toBe(true);
    expect(canRead("platform", as("admin"))).toBe(false);
    expect(canRead("platform", as("superAdmin"))).toBe(true);
  });

  it("filters a catalogue to what the reader may see", () => {
    const names = (v: Viewer) => visibleArticles(TEST_ARTICLES, v).map((a) => a.id);
    expect(names(ANONYMOUS)).toEqual(["students-add", "students-guardian", "attendance-mark", "account-sign-in"]);
    expect(names(as("teacher"))).toContain("fees-record-payment");
    expect(names(as("teacher"))).not.toContain("roles-matrix");
    expect(names(as("admin"))).toContain("roles-matrix");
    expect(names(as("admin"))).not.toContain("azure-cost");
    expect(names(as("superAdmin"))).toContain("azure-cost");
  });
});

describe("opening a screen", () => {
  it("never takes someone who is not signed in to an app screen, but allows the public ones", () => {
    expect(canOpenRoute(route("students.list"), ANONYMOUS)).toBe(false);
    expect(canOpenRoute(route("account.login"), ANONYMOUS)).toBe(true);
    expect(canOpenRoute(route("help-center.home"), ANONYMOUS)).toBe(true);
  });

  it("follows the module permission the menu uses", () => {
    expect(canOpenRoute(route("fees.home"), as("accountant", "fees"))).toBe(true);
    expect(canOpenRoute(route("fees.home"), as("teacher", "students"))).toBe(false);
    expect(canOpenRoute(route("students.list"), as("teacher", "students"))).toBe(true);
  });

  it("allows everything while permissions have not loaded, as the menu does", () => {
    expect(canOpenRoute(route("fees.home"), { role: "accountant", permissions: null })).toBe(true);
  });

  it("applies the staff-only and student-only menu split", () => {
    expect(canOpenRoute(route("online-exams.list"), as("teacher", "onlineExams"))).toBe(true);
    expect(canOpenRoute(route("online-exams.list"), as("student", "onlineExams"))).toBe(false);
    expect(canOpenRoute(route("online-exams.my"), as("student", "onlineExams"))).toBe(true);
    expect(canOpenRoute(route("online-exams.my"), as("teacher", "onlineExams"))).toBe(false);
  });

  it("keeps platform screens for the platform administrator", () => {
    expect(canOpenRoute(route("azure.overview"), as("admin"))).toBe(false);
    expect(canOpenRoute(route("azure.overview"), as("superAdmin"))).toBe(true);
    expect(canOpenRoute(route("platform-console.home"), as("admin", "platformConsole"))).toBe(false);
    expect(canOpenRoute(route("platform-console.home"), as("superAdmin", "platformConsole"))).toBe(true);
  });

  it("describes why a screen is closed without naming internal permissions", () => {
    expect(explainNoAccess(route("fees.home"), ANONYMOUS)).toBe("Sign in to open this screen.");
    expect(explainNoAccess(route("fees.home"), as("teacher"))).toMatch(/not available to your account/);
    expect(explainNoAccess(route("fees.home"), as("teacher"))).not.toMatch(/module\./);
    expect(explainNoAccess(route("online-exams.my"), as("teacher"))).toBe("My Exams is for students.");
  });

  it("knows which modules a viewer can use", () => {
    const students = { id: "students", moduleKey: "students", access: "member", defaultRoles: [], menu: [], purpose: "", title: "Students" } as const;
    expect(canUseModule(students as never, as("teacher", "students"))).toBe(true);
    expect(canUseModule(students as never, as("teacher"))).toBe(false);
    expect(canUseModule(students as never, ANONYMOUS)).toBe(false);
  });
});
