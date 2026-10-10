// The one catalogue of School Sphere's modules and screens that the Help Center, Ask School AI navigation and the
// documentation checks all read. It adds no routing of its own: `router.tsx` still defines every route and
// `constants/nav.ts` still draws the menu. `routeRegistry.test.ts` fails when either drifts from this file, so a new
// screen cannot ship unlisted (and therefore undocumented).
//
// Keep this file free of imports from the app (no icons, no stores): the documentation scripts load it directly in Node.

/** Who a screen or article is for. "staff" is any custom school role; the rest are the built-in roles. */
export type HelpRole = "superAdmin" | "admin" | "principal" | "teacher" | "accountant" | "librarian" | "receptionist" | "parent" | "student" | "staff";

export const HELP_ROLES: readonly HelpRole[] = ["admin", "principal", "teacher", "accountant", "librarian", "receptionist", "parent", "student", "staff", "superAdmin"];

export const ROLE_LABELS: Record<HelpRole, string> = {
  superAdmin: "Platform administrator",
  admin: "School administrator",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  librarian: "Librarian",
  receptionist: "Receptionist",
  parent: "Parent",
  student: "Student",
  staff: "Other staff (custom roles)",
};

/**
 * Who may read an article. public: anyone, signed in or not. member: any signed-in user. admin: school administrators and
 * principals. platform: the platform operator only. This is about reading help, not about what the screen lets you do.
 */
export type HelpAccess = "public" | "member" | "admin" | "platform";

export interface HelpModule {
  /** Stable slug used in article front matter and URLs. */
  id: string;
  title: string;
  /** One factual sentence, from what the screens actually offer. */
  purpose: string;
  /** The menu (and sub-menu) the module lives under; empty for top-level entries. */
  menu: string[];
  /** The `module.*` permission that shows it (ModulePermissions key), or null when every signed-in user sees it. */
  moduleKey: string | null;
  /** Roles that can open it on a new school, before the school edits Roles & Permissions. Admin has everything. */
  defaultRoles: HelpRole[];
  access: HelpAccess;
  /** Which mobile apps carry (part of) this module, for the manual. */
  mobile?: ("parent-student" | "teacher" | "staff")[];
}

export interface AppRoute {
  /** Stable, dotted: `<module>.<screen>`. Never reuse an id for a different screen. */
  id: string;
  /** The router path, with `:params` for detail screens. */
  path: string;
  moduleId: string;
  label: string;
  /** Present for screens a user can be taken to without choosing a record first. */
  deepLink: boolean;
  /** Menu entry label when the screen is a menu item. */
  menuItem?: string;
  /** The menu it sits under when that differs from its module's (My Homework is top level, Homework is under Academics). */
  menu?: string[];
  /** Only some audiences see this menu entry (Online Exams has staff and student menus). */
  audience?: "staff" | "student";
  /** Opened from inside another screen, not from the menu. */
  fromScreen?: string;
  /** Reachable without signing in. */
  public?: boolean;
}

const ALL_SCHOOL: HelpRole[] = ["admin", "principal", "teacher", "accountant", "librarian", "receptionist", "parent", "student"];
const ACADEMIC_FAMILY: HelpRole[] = ["admin", "principal", "teacher", "parent", "student"];

export const MODULES: readonly HelpModule[] = [
  { id: "account", title: "Signing in and your account", purpose: "Sign in, recover or change a password, and manage your sessions and devices.", menu: [], moduleKey: null, defaultRoles: [...ALL_SCHOOL, "superAdmin"], access: "public", mobile: ["parent-student", "teacher", "staff"] },
  { id: "dashboard", title: "Dashboard", purpose: "A home page of widgets for the signed-in role.", menu: [], moduleKey: null, defaultRoles: ALL_SCHOOL, access: "public" },
  { id: "ai-features", title: "AI Features and Ask School AI", purpose: "Ask questions about school data, study from materials, draft content and see insights.", menu: [], moduleKey: "aiFeatures", defaultRoles: ["admin", "principal", "teacher", "parent", "student"], access: "public" },
  { id: "notifications", title: "Notifications", purpose: "The signed-in user's notification inbox.", menu: [], moduleKey: null, defaultRoles: ["admin", "principal", "teacher", "accountant", "librarian", "parent", "student"], access: "public", mobile: ["parent-student", "teacher", "staff"] },
  { id: "calendar", title: "Calendar", purpose: "School events and dates in a calendar view.", menu: [], moduleKey: null, defaultRoles: ["admin", "principal", "teacher", "receptionist", "parent", "student"], access: "public" },
  { id: "online-classes", title: "Online Classes", purpose: "Schedule, join and review live classes and meetings.", menu: [], moduleKey: "meetings", defaultRoles: ALL_SCHOOL, access: "public", mobile: ["parent-student", "teacher"] },
  { id: "talent-showcase", title: "Talent Showcase", purpose: "Share, discover and review students' creative work.", menu: [], moduleKey: "talents", defaultRoles: ALL_SCHOOL, access: "public" },
  { id: "parent-portal", title: "Parent Portal", purpose: "A parent's view of each child: attendance, homework, results, fees, messages, leave and the school bus.", menu: [], moduleKey: "parentPortal", defaultRoles: ["admin", "parent"], access: "public", mobile: ["parent-student"] },
  { id: "study-materials", title: "Study Materials", purpose: "Browse and use study materials shared by the school.", menu: [], moduleKey: "studyMaterials", defaultRoles: ACADEMIC_FAMILY, access: "public", mobile: ["parent-student", "teacher"] },
  { id: "homework", title: "Homework", purpose: "Assign, submit and grade homework; students see their own homework.", menu: ["Academics"], moduleKey: "homework", defaultRoles: ACADEMIC_FAMILY, access: "public", mobile: ["parent-student", "teacher"] },
  { id: "students", title: "Students", purpose: "Admissions, student records, guardians, documents, promotion and graduation.", menu: ["Academics"], moduleKey: "students", defaultRoles: ["admin", "principal", "teacher", "librarian", "receptionist"], access: "public", mobile: ["teacher"] },
  { id: "academic-setup", title: "Academic Setup", purpose: "Academic years, terms, departments, classes and sections, subjects, capacity and the academic calendar.", menu: ["Academics"], moduleKey: "academics", defaultRoles: ACADEMIC_FAMILY, access: "public" },
  { id: "attendance", title: "Attendance", purpose: "Mark and review student and staff attendance, with daily, monthly and yearly views.", menu: ["Academics"], moduleKey: "attendance", defaultRoles: ACADEMIC_FAMILY, access: "public", mobile: ["parent-student", "teacher"] },
  { id: "teachers", title: "Teachers", purpose: "Teacher profiles, assigned subjects and classes, lesson plans and performance.", menu: ["Academics"], moduleKey: "teachers", defaultRoles: ACADEMIC_FAMILY, access: "public" },
  { id: "timetable", title: "Timetable", purpose: "Build and view timetables by section, room, teacher and student; periods, rooms and substitutions.", menu: ["Academics"], moduleKey: "timetable", defaultRoles: ACADEMIC_FAMILY, access: "public", mobile: ["parent-student", "teacher"] },
  { id: "examinations", title: "Examinations", purpose: "Exams, marks entry, results and ranking, report cards and transcripts.", menu: ["Academics"], moduleKey: "examinations", defaultRoles: ACADEMIC_FAMILY, access: "public", mobile: ["parent-student", "teacher"] },
  { id: "online-exams", title: "Online Exams", purpose: "Build online exams from a question bank, evaluate attempts and publish results; students take exams online.", menu: ["Online Exams"], moduleKey: "onlineExams", defaultRoles: ["admin", "principal", "teacher", "student"], access: "public" },
  { id: "staff", title: "Staff Management", purpose: "Staff records, leave requests, salary, attendance, documents and logins.", menu: ["Human Resources"], moduleKey: "staff", defaultRoles: ["admin", "principal"], access: "public" },
  { id: "payroll", title: "Payroll", purpose: "Payroll runs and payslips.", menu: ["Human Resources"], moduleKey: "payroll", defaultRoles: ["admin", "principal", "accountant"], access: "public" },
  { id: "fees", title: "Fee Management", purpose: "Fee structures, discounts, student invoices, receipts and refunds.", menu: ["Finance"], moduleKey: "fees", defaultRoles: ["admin", "principal", "accountant"], access: "public", mobile: ["parent-student", "staff"] },
  { id: "accounting", title: "Accounting", purpose: "Chart of accounts, journal, trial balance, profit and loss, and GST.", menu: ["Finance"], moduleKey: "accounting", defaultRoles: ["admin", "principal", "accountant"], access: "public" },
  { id: "library", title: "Library", purpose: "Books, authors, members, issue and return, fines and reservations.", menu: ["Campus Operations"], moduleKey: "library", defaultRoles: ["admin", "principal", "teacher", "librarian"], access: "public", mobile: ["staff"] },
  { id: "transport", title: "Transport", purpose: "Routes and stops, buses, drivers, student assignments, live bus tracking, tracking setup and the driver's trip.", menu: ["Campus Operations"], moduleKey: "transport", defaultRoles: ["admin", "principal"], access: "public", mobile: ["parent-student", "staff"] },
  { id: "hostel", title: "Hostel", purpose: "Hostels and rooms, student allocation, visitor register, attendance, fees and the mess menu.", menu: ["Campus Operations"], moduleKey: "hostel", defaultRoles: ["admin", "principal"], access: "public" },
  { id: "inventory", title: "Inventory", purpose: "Items, stock transactions, vendors and categories, and reports.", menu: ["Campus Operations"], moduleKey: "inventory", defaultRoles: ["admin"], access: "public" },
  { id: "visitors", title: "Visitors", purpose: "Visitor log, pre-approved visits, watchlist and reports.", menu: ["Campus Operations"], moduleKey: "visitors", defaultRoles: ["admin", "principal", "receptionist"], access: "public", mobile: ["staff"] },
  { id: "health", title: "Health & Medical", purpose: "Health records, checkups, vaccinations, infirmary visits and reports.", menu: ["Campus Operations"], moduleKey: "health", defaultRoles: ["admin", "principal"], access: "public" },
  { id: "communication", title: "Communication Center", purpose: "Compose messages, manage templates and groups, and review history.", menu: ["Engagement"], moduleKey: "communication", defaultRoles: ["admin", "principal"], access: "public" },
  { id: "surveys", title: "Surveys & Feedback", purpose: "Create surveys, record responses and see reports.", menu: ["Engagement"], moduleKey: "surveys", defaultRoles: ["admin", "principal"], access: "public" },
  { id: "helpdesk", title: "Help Desk", purpose: "Tickets for complaints and requests: raise, handle and report.", menu: ["Engagement"], moduleKey: "helpdesk", defaultRoles: ["admin", "principal", "receptionist"], access: "public", mobile: ["staff"] },
  { id: "certificates", title: "Certificates", purpose: "Generate certificates and keep the list of those issued.", menu: ["Engagement"], moduleKey: "certificates", defaultRoles: ["admin", "principal"], access: "public" },
  { id: "reports", title: "Reports & Analytics", purpose: "Reports on student performance, attendance, fees, teachers, admissions, dropouts, library, transport and hostel.", menu: ["Insights"], moduleKey: "reports", defaultRoles: ["admin", "principal", "accountant"], access: "public" },
  { id: "users", title: "User Management", purpose: "Create and manage the school's login accounts.", menu: ["Administration"], moduleKey: "administration", defaultRoles: ["admin", "principal"], access: "admin" },
  { id: "roles", title: "Roles & Permissions", purpose: "Roles, the permission matrix, policies, staff actions, AI permissions and feature toggles.", menu: ["Administration"], moduleKey: "administration", defaultRoles: ["admin", "principal"], access: "admin" },
  { id: "branches", title: "Branch Management", purpose: "The school's branches (campuses).", menu: ["Administration"], moduleKey: "administration", defaultRoles: ["admin", "principal"], access: "admin" },
  { id: "settings", title: "Settings", purpose: "School profile, plan, appearance, dashboard, localization, templates, backup and restore, and the audit log.", menu: ["Administration"], moduleKey: "administration", defaultRoles: ["admin", "principal"], access: "admin" },
  { id: "platform-console", title: "Platform Console", purpose: "Tenants, plans, announcements and reports across schools.", menu: ["Platform"], moduleKey: "platformConsole", defaultRoles: ["superAdmin"], access: "platform" },
  { id: "azure", title: "Azure Infrastructure", purpose: "Cost, resources and health of the platform's cloud infrastructure.", menu: ["Infrastructure"], moduleKey: null, defaultRoles: ["superAdmin"], access: "platform" },
  { id: "help-center", title: "Help Center", purpose: "This guide: searchable articles, the PDF manual and links to the screens they describe.", menu: [], moduleKey: null, defaultRoles: [...ALL_SCHOOL, "superAdmin"], access: "public" },
];

const r = (id: string, path: string, moduleId: string, label: string, extra: Partial<AppRoute> = {}): AppRoute => ({
  id,
  path,
  moduleId,
  label,
  deepLink: !path.includes(":"),
  ...extra,
});

export const ROUTES: readonly AppRoute[] = [
  r("marketing.landing", "/", "account", "Home page", { public: true }),
  r("account.login", "/login", "account", "Sign in", { public: true }),
  r("account.forgot-password", "/forgot-password", "account", "Forgot password", { public: true }),
  r("account.reset-password", "/reset-password", "account", "Reset password", { public: true }),
  r("account.change-password", "/change-password", "account", "Set a new password", { fromScreen: "Sign in with a temporary password" }),
  r("account.security", "/account/security", "account", "Security settings", { fromScreen: "Account menu" }),
  r("dashboard.home", "/dashboard", "dashboard", "Dashboard", { menuItem: "Dashboard" }),
  r("ai-features.home", "/ai", "ai-features", "AI Features", { menuItem: "AI Features" }),
  r("notifications.inbox", "/notifications", "notifications", "Notifications", { menuItem: "Notifications" }),
  r("calendar.home", "/calendar", "calendar", "Calendar", { menuItem: "Calendar" }),
  r("online-classes.home", "/online-classes", "online-classes", "Online Classes", { menuItem: "Online Classes" }),
  r("online-classes.calendar", "/online-classes/calendar", "online-classes", "Class calendar", { fromScreen: "Online Classes" }),
  r("online-classes.reports", "/online-classes/reports", "online-classes", "Class reports", { fromScreen: "Online Classes" }),
  r("online-classes.details", "/online-classes/:id", "online-classes", "Class details", { fromScreen: "Online Classes" }),
  r("online-classes.room", "/online-classes/:id/room", "online-classes", "Live classroom", { fromScreen: "Class details" }),
  r("talent-showcase.discover", "/talents", "talent-showcase", "Talent Showcase", { menuItem: "Talent Showcase" }),
  r("talent-showcase.explore", "/talents/explore", "talent-showcase", "Explore talents", { fromScreen: "Talent Showcase" }),
  r("talent-showcase.new", "/talents/new", "talent-showcase", "Share a talent", { fromScreen: "Talent Showcase" }),
  r("talent-showcase.mine", "/talents/mine", "talent-showcase", "My talents", { fromScreen: "Talent Showcase" }),
  r("talent-showcase.review", "/talents/review", "talent-showcase", "Review center", { fromScreen: "Talent Showcase" }),
  r("talent-showcase.creator", "/talents/creators/:userId", "talent-showcase", "Creator profile", { fromScreen: "Talent Showcase" }),
  r("talent-showcase.school", "/talents/schools/:tenantId", "talent-showcase", "School showcase", { fromScreen: "Talent Showcase" }),
  r("talent-showcase.detail", "/talents/:id", "talent-showcase", "Talent details", { fromScreen: "Talent Showcase" }),
  r("talent-showcase.edit", "/talents/:id/edit", "talent-showcase", "Edit a talent", { fromScreen: "Talent details" }),
  r("parent-portal.home", "/parent-portal", "parent-portal", "Parent Portal", { menuItem: "Parent Portal" }),
  r("homework.mine", "/my-homework", "homework", "My Homework", { menuItem: "My Homework", menu: [] }),
  r("homework.manage", "/homework", "homework", "Homework", { menuItem: "Homework" }),
  r("study-materials.home", "/study-materials", "study-materials", "Study Materials", { menuItem: "Study Materials" }),
  r("students.list", "/students", "students", "Students", { menuItem: "Students" }),
  r("students.profile", "/students/:studentId", "students", "Student profile", { fromScreen: "Students" }),
  r("academic-setup.home", "/academics", "academic-setup", "Academic Setup", { menuItem: "Academic Setup" }),
  r("attendance.home", "/attendance", "attendance", "Attendance", { menuItem: "Attendance" }),
  r("teachers.list", "/teachers", "teachers", "Teachers", { menuItem: "Teachers" }),
  r("teachers.profile", "/teachers/:staffId", "teachers", "Teacher profile", { fromScreen: "Teachers" }),
  r("timetable.home", "/timetable", "timetable", "Timetable", { menuItem: "Timetable" }),
  r("examinations.home", "/examinations", "examinations", "Examinations", { menuItem: "Examinations" }),
  r("online-exams.dashboard", "/online-exams", "online-exams", "Exam Dashboard", { menuItem: "Exam Dashboard", audience: "staff" }),
  r("online-exams.list", "/online-exams/exams", "online-exams", "Exams", { menuItem: "Exams", audience: "staff" }),
  r("online-exams.new", "/online-exams/exams/new", "online-exams", "Create an exam", { fromScreen: "Exams" }),
  r("online-exams.detail", "/online-exams/exams/:id", "online-exams", "Exam details", { fromScreen: "Exams" }),
  r("online-exams.edit", "/online-exams/exams/:id/edit", "online-exams", "Edit an exam", { fromScreen: "Exam details" }),
  r("online-exams.exam-results", "/online-exams/exams/:id/results", "online-exams", "Exam results", { fromScreen: "Exam details" }),
  r("online-exams.attempt", "/online-exams/exams/:id/attempts/:attemptId", "online-exams", "Review an attempt", { fromScreen: "Exam results" }),
  r("online-exams.question-bank", "/online-exams/question-bank", "online-exams", "Question Bank", { menuItem: "Question Bank", audience: "staff" }),
  r("online-exams.evaluations", "/online-exams/evaluations", "online-exams", "Evaluations", { menuItem: "Evaluations", audience: "staff" }),
  r("online-exams.results", "/online-exams/results", "online-exams", "Results", { menuItem: "Results", audience: "staff" }),
  r("online-exams.reports", "/online-exams/reports", "online-exams", "Exam Reports", { menuItem: "Exam Reports", audience: "staff" }),
  r("online-exams.my", "/online-exams/my", "online-exams", "My Exams", { menuItem: "My Exams", audience: "student" }),
  r("online-exams.my-upcoming", "/online-exams/my/upcoming", "online-exams", "Upcoming Exams", { menuItem: "Upcoming Exams", audience: "student" }),
  r("online-exams.my-completed", "/online-exams/my/completed", "online-exams", "Completed Exams", { menuItem: "Completed Exams", audience: "student" }),
  r("online-exams.my-results", "/online-exams/my/results", "online-exams", "My Results", { menuItem: "My Results", audience: "student" }),
  r("online-exams.my-result", "/online-exams/my/:id/result", "online-exams", "My result", { fromScreen: "My Results" }),
  r("online-exams.take", "/online-exams/take/:id", "online-exams", "Take an exam", { fromScreen: "My Exams" }),
  r("staff.list", "/staff", "staff", "Staff Management", { menuItem: "Staff Management" }),
  r("staff.profile", "/staff/:staffId", "staff", "Staff profile", { fromScreen: "Staff Management" }),
  r("payroll.home", "/payroll", "payroll", "Payroll", { menuItem: "Payroll" }),
  r("fees.home", "/fees", "fees", "Fee Management", { menuItem: "Fee Management" }),
  r("accounting.home", "/accounting", "accounting", "Accounting", { menuItem: "Accounting" }),
  r("library.home", "/library", "library", "Library", { menuItem: "Library" }),
  r("transport.home", "/transport", "transport", "Transport", { menuItem: "Transport" }),
  r("hostel.home", "/hostel", "hostel", "Hostel", { menuItem: "Hostel" }),
  r("inventory.home", "/inventory", "inventory", "Inventory", { menuItem: "Inventory" }),
  r("visitors.home", "/visitors", "visitors", "Visitors", { menuItem: "Visitors" }),
  r("health.home", "/health", "health", "Health & Medical", { menuItem: "Health & Medical" }),
  r("communication.home", "/communication", "communication", "Communication Center", { menuItem: "Communication Center" }),
  r("surveys.home", "/surveys", "surveys", "Surveys & Feedback", { menuItem: "Surveys & Feedback" }),
  r("helpdesk.home", "/helpdesk", "helpdesk", "Help Desk", { menuItem: "Help Desk" }),
  r("certificates.home", "/certificates", "certificates", "Certificates", { menuItem: "Certificates" }),
  r("reports.home", "/reports", "reports", "Reports & Analytics", { menuItem: "Reports & Analytics" }),
  r("users.list", "/admin/users", "users", "User Management", { menuItem: "User Management" }),
  r("roles.home", "/admin/roles", "roles", "Roles & Permissions", { menuItem: "Roles & Permissions" }),
  r("branches.home", "/admin/branches", "branches", "Branch Management", { menuItem: "Branch Management" }),
  r("settings.home", "/admin/settings", "settings", "Settings", { menuItem: "Settings" }),
  r("platform-console.home", "/platform", "platform-console", "Platform Console", { menuItem: "Platform Console" }),
  r("azure.overview", "/admin/azure", "azure", "Azure Infrastructure", { menuItem: "Azure Infrastructure" }),
  r("azure.cost", "/admin/azure/cost", "azure", "Azure cost", { fromScreen: "Azure Infrastructure" }),
  r("azure.resources", "/admin/azure/resources", "azure", "Azure resources", { fromScreen: "Azure Infrastructure" }),
  r("azure.resource-detail", "/admin/azure/resources/detail", "azure", "Azure resource detail", { fromScreen: "Azure resources" }),
  r("azure.compute", "/admin/azure/compute", "azure", "Azure compute", { fromScreen: "Azure Infrastructure" }),
  r("azure.databases", "/admin/azure/databases", "azure", "Azure databases", { fromScreen: "Azure Infrastructure" }),
  r("azure.storage", "/admin/azure/storage", "azure", "Azure storage", { fromScreen: "Azure Infrastructure" }),
  r("azure.containers", "/admin/azure/containers", "azure", "Azure containers", { fromScreen: "Azure Infrastructure" }),
  r("azure.monitoring", "/admin/azure/monitoring", "azure", "Azure monitoring", { fromScreen: "Azure Infrastructure" }),
  r("azure.alerts", "/admin/azure/alerts", "azure", "Azure alerts", { fromScreen: "Azure Infrastructure" }),
  r("azure.settings", "/admin/azure/settings", "azure", "Azure settings", { fromScreen: "Azure Infrastructure" }),
  r("help-center.home", "/help", "help-center", "Help Center", { fromScreen: "Account menu or Ask School AI", public: true }),
  r("help-center.module", "/help/m/:moduleId", "help-center", "Help for a module", { fromScreen: "Help Center", public: true }),
  r("help-center.role", "/help/r/:role", "help-center", "Help for a role", { fromScreen: "Help Center", public: true }),
  r("help-center.article", "/help/a/:articleId", "help-center", "Help article", { fromScreen: "Help Center", public: true }),
];

const moduleById = new Map(MODULES.map((m) => [m.id, m] as const));
const routeById = new Map(ROUTES.map((x) => [x.id, x] as const));

export const getModule = (id: string): HelpModule | undefined => moduleById.get(id);
export const getRoute = (id: string): AppRoute | undefined => routeById.get(id);

/** The full menu path of a screen, for example ["Academics", "Students"]; top-level entries have just their own name. */
export function menuPathOf(route: AppRoute): string[] {
  const module = moduleById.get(route.moduleId);
  if (!module || !route.menuItem) return route.fromScreen ? [route.fromScreen, route.label] : [route.label];
  return [...(route.menu ?? module.menu), route.menuItem];
}

/** The route a concrete URL belongs to (`/students/42` -> students.profile), or undefined. Static segments win over `:params`. */
export function routeForPath(pathname: string): AppRoute | undefined {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const parts = clean.split("/");
  let best: { route: AppRoute; statics: number } | undefined;
  for (const route of ROUTES) {
    const rp = route.path.split("/");
    if (rp.length !== parts.length) continue;
    let statics = 0;
    const ok = rp.every((seg, i) => {
      if (seg.startsWith(":")) return parts[i] !== "";
      if (seg === parts[i]) {
        statics++;
        return true;
      }
      return false;
    });
    if (ok && (!best || statics > best.statics)) best = { route, statics };
  }
  return best?.route;
}
