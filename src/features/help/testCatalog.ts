import type { HelpArticle, HelpCatalog } from "./types";

/** A small, fixed catalogue for tests, so they never depend on the wording of the real articles. */
export function article(over: Partial<HelpArticle> & Pick<HelpArticle, "id" | "title" | "module">): HelpArticle {
  return {
    kind: "task",
    access: "public",
    roles: ["admin"],
    route: null,
    summary: "",
    related: [],
    keywords: [],
    tasks: [],
    order: 10,
    status: "reviewed",
    verifiedOn: null,
    e2e: "none",
    screenshots: [],
    video: null,
    headings: [],
    blocks: [],
    text: "",
    source: `docs/help/${over.id}.md`,
    ...over,
  };
}

const p = (text: string) => ({ type: "p" as const, inline: [{ t: "text" as const, v: text }] });

export const TEST_ARTICLES: HelpArticle[] = [
  article({
    id: "students-add",
    title: "Add a student",
    module: "students",
    route: "students.list",
    roles: ["admin", "principal", "receptionist"],
    summary: "Register a new student and their guardian.",
    tasks: [{ id: "create-student", label: "Add a new student", phrases: ["register a student", "admit a student", "new student"], route: "students.list", hint: null }],
    keywords: ["admission", "enrol"],
    headings: [{ id: "steps", text: "Steps", level: 2 }],
    blocks: [{ type: "heading", level: 2, id: "steps", text: "Steps" }, { type: "steps", items: [{ inline: [{ t: "text", v: "Open Students." }], notes: [] }] }, p("Related: see the guardian article.")],
    text: "Steps\n1. Open Students.\n2. Select Register student.",
    related: ["students-guardian"],
  }),
  article({
    id: "students-guardian",
    title: "Add a guardian",
    module: "students",
    route: "students.list",
    roles: ["admin"],
    summary: "Guardians are linked to a student.",
    text: "Add guardian details on the student profile.",
    order: 20,
    tasks: [{ id: "add-guardian", label: "Add a guardian", phrases: ["add a parent", "new guardian"], route: "students.list", hint: null }],
  }),
  article({
    id: "fees-record-payment",
    title: "Record a fee payment",
    module: "fees",
    route: "fees.home",
    roles: ["admin", "accountant"],
    summary: "Take a payment against an invoice.",
    text: "Record payment on an invoice.",
    access: "member",
    blocks: [{ type: "steps", items: [{ inline: [{ t: "text", v: "Open " }, { t: "bold", c: [{ t: "text", v: "Fee Management" }] }, { t: "text", v: "." }], notes: [] }] }],
  }),
  article({
    id: "attendance-mark",
    title: "Mark attendance for a class",
    module: "attendance",
    route: "attendance.home",
    roles: ["admin", "principal", "teacher"],
    summary: "Record who is present for a section.",
    text: "Open Attendance and save the day's marks.",
    tasks: [{ id: "mark-attendance", label: "Mark attendance for a class", phrases: ["mark attendance", "take attendance", "record attendance"], route: "attendance.home", hint: null }],
    blocks: [{ type: "steps", items: [{ inline: [{ t: "text", v: "Open Attendance." }], notes: [] }] }],
  }),
  article({ id: "roles-matrix", title: "Edit the permission matrix", module: "roles", route: "roles.home", roles: ["admin"], summary: "Decide what each role can open.", text: "Permission matrix.", access: "admin" }),
  article({ id: "azure-cost", title: "Read the Azure cost report", module: "azure", route: "azure.cost", roles: ["superAdmin"], summary: "Cloud cost.", text: "Cost.", access: "platform" }),
  article({ id: "account-sign-in", title: "Sign in", module: "account", route: "account.login", roles: ["admin", "teacher", "parent", "student"], summary: "Sign in with email.", text: "Sign in.", kind: "task" }),
];

export const TEST_CATALOG: HelpCatalog = {
  appVersion: "0.0.0",
  revision: "test",
  modules: [],
  articles: TEST_ARTICLES,
  tasks: TEST_ARTICLES.flatMap((a) => a.tasks.map((t) => ({ ...t, articleId: a.id, moduleId: a.module }))),
  screenshots: [],
  videos: [],
};
