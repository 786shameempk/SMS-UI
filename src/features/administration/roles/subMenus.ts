/**
 * The tabs ("sub-menus") inside each module's pages that a school can show or hide per role in Roles & permissions → Sub-menus.
 * A tab is identified by "{route id}:{tab value}" (see `tabKey`), where the route id comes from the app's route registry and the tab value
 * is the `value` of its <TabsTrigger>. Only a page's primary tab strip (<TabsList variant="line">) can be hidden.
 *
 * `matrixModule` is the Permission matrix row that makes the page visible to a role: a page is offered for a role only
 * when the role can see that module.
 */
export interface SubMenuTab {
  value: string;
  label: string;
}

export interface SubMenuPage {
  routeId: string;
  /** A PERMISSION_MODULES entry. */
  matrixModule: string;
  title: string;
  tabs: SubMenuTab[];
}

const t = (value: string, label: string): SubMenuTab => ({ value, label });

export const SUB_MENU_CATALOG: readonly SubMenuPage[] = [
  { routeId: "students.list", matrixModule: "Students", title: "Student management", tabs: [t("students", "Students"), t("admissions", "Admissions"), t("promotion", "Promotion & Graduation")] },
  {
    routeId: "students.profile",
    matrixModule: "Students",
    title: "Student profile",
    tabs: [t("overview", "Overview"), t("guardian", "Guardian & Emergency"), t("medical", "Medical"), t("transport", "Transport & Hostel"), t("documents", "Documents"), t("idcard", "ID Card"), t("learning", "Learning profile"), t("logins", "Logins")],
  },
  {
    routeId: "academic-setup.home",
    matrixModule: "Academic Setup",
    title: "Academic management",
    tabs: [t("academic-years", "Academic Years"), t("terms", "Terms"), t("departments", "Departments"), t("classes-sections", "Classes & Sections"), t("subjects", "Subjects"), t("capacity", "Class Capacity"), t("calendar", "Academic Calendar")],
  },
  { routeId: "attendance.home", matrixModule: "Attendance", title: "Attendance management", tabs: [t("mark-attendance", "Mark Attendance"), t("staff-attendance", "Staff Attendance / My Leave"), t("reports", "Reports")] },
  {
    routeId: "teachers.profile",
    matrixModule: "Teachers",
    title: "Teacher profile",
    tabs: [t("overview", "Overview"), t("qualifications", "Qualifications & Experience"), t("salary", "Salary"), t("attendance", "Attendance"), t("performance", "Performance"), t("documents", "Documents"), t("subjects-classes", "Subjects & Classes"), t("lesson-plans", "Lesson Plans"), t("student-performance", "Student Performance")],
  },
  {
    routeId: "timetable.home",
    matrixModule: "Timetable",
    title: "Timetable",
    tabs: [t("class-section", "Class/Section View"), t("teacher", "Teacher View"), t("student-parent", "Student/Parent View"), t("periods", "Periods"), t("rooms", "Rooms"), t("substitutions", "Substitutions")],
  },
  { routeId: "examinations.home", matrixModule: "Examinations", title: "Examinations", tabs: [t("exams", "Exams"), t("marks-entry", "Marks Entry"), t("results-ranking", "Results & Ranking"), t("report-cards", "Report Cards"), t("transcript", "Transcript")] },
  { routeId: "homework.manage", matrixModule: "Homework", title: "Homework", tabs: [t("homework", "Homework"), t("resources", "Learning Resources"), t("progress", "Progress Overview")] },
  { routeId: "homework.mine", matrixModule: "Homework", title: "My Homework", tabs: [t("homework", "My Homework"), t("resources", "Resources")] },
  { routeId: "study-materials.home", matrixModule: "Study Materials", title: "Study Materials", tabs: [t("browse", "Browse"), t("mine", "My materials")] },
  {
    routeId: "staff.list",
    matrixModule: "Staff Management",
    title: "Staff management",
    tabs: [t("staff", "Staff"), t("details", "My Details"), t("leave", "Leave Requests"), t("payslips", "Payslips")],
  },
  {
    routeId: "staff.profile",
    matrixModule: "Staff Management",
    title: "Staff profile",
    tabs: [t("overview", "Overview"), t("qualifications", "Qualifications & Experience"), t("salary", "Salary"), t("attendance", "Attendance"), t("performance", "Performance"), t("documents", "Documents"), t("logins", "Login")],
  },
  { routeId: "payroll.home", matrixModule: "Payroll", title: "Payroll", tabs: [t("runs", "Payroll Runs"), t("payslips", "Payslips")] },
  {
    routeId: "fees.home",
    matrixModule: "Fee Management",
    title: "Fee management",
    tabs: [t("structures", "Fee Structures"), t("discounts", "Discounts & Scholarships"), t("invoices", "Student Invoices"), t("overdue", "Overdue"), t("receipts", "Receipts"), t("refunds", "Refunds")],
  },
  { routeId: "accounting.home", matrixModule: "Accounting", title: "Accounting", tabs: [t("accounts", "Chart of Accounts"), t("journal", "Journal"), t("trial-balance", "Trial Balance"), t("pnl", "Profit & Loss"), t("gst", "GST")] },
  {
    routeId: "library.home",
    matrixModule: "Library Management",
    title: "Library",
    tabs: [t("books", "Books"), t("catalog", "Authors, Publishers & Categories"), t("members", "Members"), t("issue-return", "Issue / Return"), t("fines", "Fines"), t("reservations", "Reservations")],
  },
  {
    routeId: "transport.home",
    matrixModule: "Transport Management",
    title: "Transport",
    tabs: [t("routes", "Routes & Stops"), t("buses", "Buses"), t("drivers", "Drivers"), t("assignments", "Student Assignment"), t("live", "Live Tracking"), t("setup", "Tracking setup"), t("driver", "Driver trip")],
  },
  {
    routeId: "hostel.home",
    matrixModule: "Hostel Management",
    title: "Hostel",
    tabs: [t("hostels", "Hostels & Rooms"), t("allocations", "Student Allocation"), t("visitors", "Visitor Register"), t("attendance", "Hostel Attendance"), t("fees", "Hostel Fees"), t("mess", "Mess Menu")],
  },
  { routeId: "inventory.home", matrixModule: "Inventory Management", title: "Inventory", tabs: [t("items", "Items"), t("transactions", "Stock Transactions"), t("vendors", "Vendors & Categories"), t("reports", "Reports")] },
  { routeId: "visitors.home", matrixModule: "Visitor Management", title: "Visitors", tabs: [t("log", "Visitor Log"), t("preapproved", "Pre-Approved Visits"), t("watchlist", "Watchlist"), t("reports", "Reports")] },
  { routeId: "health.home", matrixModule: "Health & Medical", title: "Health & Medical", tabs: [t("records", "Health Records"), t("checkups", "Checkups"), t("vaccinations", "Vaccinations"), t("visits", "Infirmary Visits"), t("reports", "Reports")] },
  { routeId: "communication.home", matrixModule: "Communication Center", title: "Communication Center", tabs: [t("compose", "Compose"), t("templates", "Templates"), t("groups", "Groups"), t("history", "History")] },
  { routeId: "surveys.home", matrixModule: "Surveys & Feedback", title: "Surveys & Feedback", tabs: [t("surveys", "Surveys"), t("respond", "Record a Response"), t("reports", "Reports")] },
  { routeId: "helpdesk.home", matrixModule: "Complaint / Help Desk", title: "Help Desk", tabs: [t("tickets", "Tickets"), t("raise", "Raise a Ticket"), t("reports", "Reports")] },
  { routeId: "certificates.home", matrixModule: "Certificate Generator", title: "Certificates", tabs: [t("generate", "Generate"), t("issued", "Issued Certificates")] },
  {
    routeId: "reports.home",
    matrixModule: "Reports & Analytics",
    title: "Reports & Analytics",
    tabs: [t("student-performance", "Student Performance"), t("attendance", "Attendance"), t("fees", "Fee Collection"), t("teachers", "Teacher Performance"), t("admissions", "Admissions"), t("dropout", "Dropout Analysis"), t("library", "Library Usage"), t("transport", "Transport"), t("hostel", "Hostel Occupancy")],
  },
  {
    routeId: "settings.home",
    matrixModule: "Settings",
    title: "Settings",
    tabs: [t("profile", "School Profile"), t("subscription", "Plan & Subscription"), t("branding", "Appearance"), t("dashboard", "Dashboard"), t("localization", "Localization"), t("templates", "Templates"), t("backup", "Backup & Restore"), t("audit", "Audit Log")],
  },
];

/** The Permission matrix row id that makes `module` visible ("Fee Management" -> "perm-fee-management-menu"). */
export const menuPermissionId = (module: string) => `perm-${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-menu`;
