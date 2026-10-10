import type { ModulePermissions } from "@/types/auth";
import { ANONYMOUS, type Viewer } from "./access";
import { answerHelpQuestion, firstSteps, taskScore } from "./assistant";
import { TEST_ARTICLES, TEST_CATALOG } from "./testCatalog";

const perms = (...on: string[]) => Object.fromEntries(on.map((k) => [k, true])) as unknown as ModulePermissions;
const teacher: Viewer = { role: "teacher", permissions: perms("students") };
const ask = (q: string, viewer: Viewer = teacher) => answerHelpQuestion(q, viewer, TEST_CATALOG);

describe("answering how-to questions from the guide", () => {
  it("gives the documented steps, the menu path and the screen to open", () => {
    const reply = ask("How do I add a student?");
    expect(reply).toMatchObject({ kind: "answer", article: { id: "students-add" }, steps: ["Open Students."], menuPath: ["Academics", "Students"] });
    expect(reply).toMatchObject({ navigation: { status: "ok", path: "/students" }, action: { type: "navigate", routeId: "students.list", taskId: "create-student" } });
  });

  it("understands everyday wording for the same task", () => {
    for (const q of ["register a student", "admit a new student", "how can I create a student record"]) {
      expect(ask(q), q).toMatchObject({ kind: "answer", article: { id: "students-add" } });
    }
  });

  it("links the related guides the reader may see", () => {
    expect(ask("add a student")).toMatchObject({ related: [{ id: "students-guardian" }] });
  });
});

describe("taking the reader to a screen", () => {
  it("opens the screen on a clear command", () => {
    expect(ask("Take me to add a student")).toMatchObject({ kind: "navigate", label: "Add a new student", navigation: { path: "/students" } });
    expect(ask("go to register a student")).toMatchObject({ kind: "navigate" });
  });

  it("says why instead, with no steps, when the account cannot open the screen", () => {
    const noStudents: Viewer = { role: "teacher", permissions: perms("homework") };
    const reply = ask("take me to add a student", noStudents);
    expect(reply).toMatchObject({ kind: "denied", label: "Add a new student" });
    expect(reply).not.toHaveProperty("steps");
    expect((reply as { message: string }).message).toMatch(/not available to your account/);
    // Asking how to do it must not leak the steps either.
    expect(ask("how do I add a student", noStudents)).toMatchObject({ kind: "denied" });
  });

  it("only answers signed-in readers", () => {
    expect(ask("add a student", ANONYMOUS)).toBeNull();
  });
});

describe("unclear questions", () => {
  it("asks which task is meant instead of guessing between near ties", () => {
    const reply = ask("student guardian");
    expect(reply).toMatchObject({ kind: "choose" });
    expect((reply as { choices: { taskId: string }[] }).choices.map((c) => c.taskId).sort()).toEqual(["add-guardian", "create-student"]);
  });

  it("points to guides that contain every word asked when no task matches", () => {
    expect(ask("record fee payment", { role: "accountant", permissions: perms("fees") })).toMatchObject({ kind: "articles", articles: [{ id: "fees-record-payment" }] });
  });

  it("checks a partial match with the reader rather than answering as if it were certain", () => {
    expect(ask("student details")).toMatchObject({ kind: "choose", choices: [{ taskId: "create-student" }] });
  });

  it("does not treat one common word as a help request", () => {
    for (const q of ["first", "question", "student", "add", "student guardian cost"]) expect(ask(q), q).toBeNull();
  });

  it("returns nothing for what the guide does not cover, so the question can go to the AI service", () => {
    expect(ask("what is the weather today")).toBeNull();
    expect(ask("hi")).toBeNull();
  });

  it("never offers articles the reader may not read", () => {
    expect(ask("edit the permission matrix")).toBeNull();
    expect(ask("edit the permission matrix", { role: "admin", permissions: perms("administration") })).toMatchObject({ kind: "articles", articles: [{ id: "roles-matrix" }] });
  });
});

describe("helpers", () => {
  it("scores a task by how well its own words cover the question", () => {
    const task = TEST_CATALOG.tasks.find((t) => t.id === "create-student")!;
    expect(taskScore("add a student", task)).toBeGreaterThan(0.9);
    expect(taskScore("student", task)).toBeLessThan(taskScore("add a student", task));
    expect(taskScore("fees", task)).toBe(0);
  });

  it("reads steps as plain text and caps them", () => {
    expect(firstSteps(TEST_ARTICLES.find((a) => a.id === "fees-record-payment")!)).toEqual({ steps: ["Open Fee Management."], more: false });
    const many = { ...TEST_ARTICLES[0], blocks: [{ type: "steps" as const, items: Array.from({ length: 12 }, (_, i) => ({ inline: [{ t: "text" as const, v: `Step ${i + 1}` }], notes: [] })) }] };
    const { steps, more } = firstSteps(many);
    expect(steps).toHaveLength(8);
    expect(more).toBe(true);
  });
});

describe("what the reader's role may do", () => {
  const parent: Viewer = { role: "parent", permissions: perms("attendance", "students") };
  const student: Viewer = { role: "student", permissions: perms("attendance") };

  it("tells a parent or student plainly that marking attendance is not for them, with no steps, screen or guide link", () => {
    for (const viewer of [parent, student]) {
      const reply = ask("How can I mark attendance?", viewer);
      expect(reply, viewer.role!).toMatchObject({ kind: "denied", label: "Mark attendance for a class", article: null });
      const message = (reply as { message: string }).message;
      expect(message).toContain(viewer.role === "parent" ? "as a parent" : "as a student");
      expect(message).toContain("can't mark attendance for a class");
      expect(message).toContain("administrators, principals and teachers");
      expect(JSON.stringify(reply)).not.toMatch(/navigation|steps|related/);
    }
  });

  it("does not offer a taking-me-there button for a task the role does not do", () => {
    expect(ask("Take me to mark attendance", parent)).toMatchObject({ kind: "denied", article: null });
  });

  it("does not suggest staff-only guides to a parent when the question is only partly matched", () => {
    const reply = ask("attendance students register", parent);
    expect(reply === null || reply.kind === "denied" || reply.kind === "choose").toBe(true);
    if (reply?.kind === "choose") expect(reply.choices.map((c) => c.taskId)).not.toContain("mark-attendance");
    if (reply?.kind === "articles") expect(reply.articles.map((a) => a.id)).not.toContain("attendance-mark");
  });

  it("still answers a teacher, and a custom staff role whose school switched the module on", () => {
    expect(ask("How can I mark attendance?", { role: "teacher", permissions: perms("attendance") })).toMatchObject({ kind: "answer", article: { id: "attendance-mark" } });
    expect(ask("How can I mark attendance?", { role: "librarian" as never, permissions: perms("attendance") })).toMatchObject({ kind: "answer" });
  });

  it("explains a closed module to a teacher without steps", () => {
    expect(ask("How can I mark attendance?", { role: "teacher", permissions: perms("students") })).toMatchObject({ kind: "denied", article: null });
  });
});
