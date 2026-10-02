import * as homework from "./api";
import { academicHttpClient } from "@/lib/httpClient";
import { checkCrud } from "@/test/crud";
import { stubClient } from "@/test/utils";

const hw = { id: "h1", tenantId: "t", branchId: "b", title: "Ex 4.1", description: "", subjectId: "math", classId: "c5", sectionId: null, staffId: "sf1", assignedDate: "a", dueDate: "b", attachmentNote: null, status: "Published" };
const submission = (overrides: Record<string, unknown> = {}) => ({
  id: "sb1", tenantId: "t", branchId: "b", homeworkId: "h1", studentId: "st1", submittedAt: null, content: "", status: "ResubmitRequested", grade: null, feedback: null, ...overrides,
});
const resource = { id: "lr1", tenantId: "t", branchId: "b", subjectId: "math", classId: "c5", title: "Fractions video", type: "Video", url: null, description: null, createdByStaffId: "sf1", quizId: null, createdAt: "" };

describe("homework api", () => {
  it("homework CRUD sends nulls for optional fields", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/homework",
      dto: hw,
      values: { title: "Ex 4.1", description: "", subjectId: "math", classId: "c5", staffId: "sf1", assignedDate: "a", dueDate: "b", status: "draft" } as never,
      list: homework.listHomework,
      create: homework.createHomework,
      update: homework.updateHomework,
      remove: homework.deleteHomework,
      sent: { title: "Ex 4.1", description: "", subjectId: "math", classId: "c5", staffId: "sf1", assignedDate: "a", dueDate: "b", sectionId: null, attachmentNote: null, status: "Draft" },
      mapped: { status: "published", sectionId: undefined, attachmentNote: undefined },
      fallback: { dto: { ...hw, id: "h2", status: "?" }, mapped: { status: "draft" } },
    }));

  it("finds homework and quizzes by id from the list", async () => {
    stubClient(academicHttpClient, {
      "GET /api/homework": [hw],
      "GET /api/learning/quizzes": [{ id: "q1", tenantId: "t", branchId: "b", subjectId: "math", classId: "c5", title: "Q", questions: [{ id: "qq1", text: "2+2?", options: ["3", "4"], correctIndex: 1 }] }],
    });

    expect((await homework.getHomework("h1")).title).toBe("Ex 4.1");
    await expect(homework.getHomework("x")).rejects.toThrow("Homework not found");
    expect((await homework.getQuiz("q1")).questions[0].correctIndex).toBe(1);
    await expect(homework.getQuiz("x")).rejects.toThrow("Quiz not found");
  });

  it("submissions: submit, grade and ask for a resubmission", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/homework/h1/submissions": [submission(), submission({ id: "sb2", status: "?" })],
      "GET /api/homework/assigned/st1": [{ homework: hw, submission: submission({ status: "Graded", grade: "A", feedback: "Good" }) }],
      "POST /api/homework/h1/submit": submission({ status: "Submitted", submittedAt: "2026-10-01" }),
      "POST /api/homework/submissions/sb1/grade": submission({ status: "Graded", grade: "9" }),
      "POST /api/homework/submissions/sb1/request-resubmission": submission(),
    });

    expect((await homework.listSubmissionsForHomework("h1")).map((s) => s.status)).toEqual(["resubmit_requested", "not_submitted"]);
    expect((await homework.listAssignedHomework("st1"))[0].submission).toMatchObject({ status: "graded", grade: "A", feedback: "Good" });
    expect((await homework.submitHomework("h1", "st1", "My answer")).submittedAt).toBe("2026-10-01");
    expect((await homework.gradeSubmission("sb1", 9)).grade).toBe("9");
    await homework.requestResubmission("sb1", "Show working");

    expect(calls[2].body).toEqual({ studentId: "st1", content: "My answer" });
    expect(calls[3].body).toEqual({ grade: "9", feedback: null });
    expect(calls[4].body).toEqual({ feedback: "Show working" });
  });

  it("learning resources", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/learning/resources",
      dto: resource,
      values: { subjectId: "math", classId: "c5", title: "Fractions video", type: "ppt", createdByStaffId: "sf1" } as never,
      list: homework.listLearningResources,
      create: homework.createLearningResource,
      update: homework.updateLearningResource,
      remove: homework.deleteLearningResource,
      sent: { subjectId: "math", classId: "c5", title: "Fractions video", type: "Ppt", createdByStaffId: "sf1", url: null, description: null },
      mapped: { type: "video", url: undefined, quizId: undefined },
      fallback: { dto: { ...resource, id: "lr2", type: "?" }, mapped: { type: "notes" } },
    }));

  it("quizzes, attempts, comments, views and progress", async () => {
    const quiz = { id: "q1", tenantId: "t", branchId: "b", subjectId: "math", classId: "c5", title: "Q", questions: [] };
    const attempt = { id: "at1", tenantId: "t", branchId: "b", quizId: "q1", studentId: "st1", score: 2, submittedAt: "" };
    const comment = { id: "cm1", tenantId: "t", branchId: "b", resourceId: "lr1", authorName: "Asha", authorRole: "student", text: "Thanks!", postedAt: "" };
    const calls = stubClient(academicHttpClient, {
      "POST /api/learning/quizzes": quiz,
      "DELETE /api/learning/quizzes/q1": null,
      "GET /api/learning/quizzes/attempts": [attempt],
      "POST /api/learning/quizzes/q1/attempts": attempt,
      "GET /api/learning/resources/lr1/comments": [comment],
      "POST /api/learning/resources/lr1/comments": comment,
      "GET /api/learning/views/st1": ["lr1"],
      "POST /api/learning/views": null,
      "GET /api/learning/progress": [{ studentId: "st1", studentName: "Asha", className: "Class 5", section: "A", homeworkAssignedCount: 4, homeworkSubmittedOnTimeCount: 3, homeworkSubmittedOnTimePct: 75, resourceCount: 2, resourceViewedCount: 1, resourceViewedPct: 50 }],
    });

    await homework.createQuiz({ subjectId: "math", classId: "c5", title: "Q", questions: [{ text: "2+2?", options: ["3", "4"], correctIndex: 1 }] } as never, "sf1");
    await homework.deleteQuiz("q1");
    expect(await homework.listQuizAttempts("q1")).toEqual([attempt]);
    expect((await homework.submitQuizAttempt("q1", "st1", [1])).score).toBe(2);
    expect(await homework.listDiscussionComments("lr1")).toEqual([comment]);
    await homework.addDiscussionComment("lr1", { text: "Thanks!" } as never);
    expect(await homework.getViewedResourceIds("st1")).toEqual(["lr1"]);
    await homework.markResourceViewed("st1", "lr1");
    expect((await homework.getLearningProgress())[0].homeworkSubmittedOnTimePct).toBe(75);

    expect(calls[0].body).toEqual({ subjectId: "math", classId: "c5", title: "Q", questions: [{ text: "2+2?", options: ["3", "4"], correctIndex: 1 }], createdByStaffId: "sf1" });
    expect(calls[3].body).toEqual({ studentId: "st1", answers: [1] });
    expect(calls[7].body).toEqual({ studentId: "st1", resourceId: "lr1" });
  });
});
