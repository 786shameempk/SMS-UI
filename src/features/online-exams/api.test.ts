import * as exams from "./api";
import * as surveys from "@/features/surveys/api";
import { academicHttpClient, engagementHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [{ id: "st1", firstName: "Asha", lastName: "N", className: "Class 5", section: "A" }]),
}));
vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [{ id: "sf1", firstName: "Meera", lastName: "Rao", designation: "Teacher" }]),
}));

const any = { "GET .*": {}, "POST .*": {}, "PUT .*": {}, "DELETE .*": null };

describe("online exams api", () => {
  it.each([
    ["listQuestions", () => exams.listQuestions({ subjectId: "math", topic: "", difficulty: undefined } as never), "GET", "/api/question-bank", { subjectId: "math" }],
    ["listQuestionTopics", () => exams.listQuestionTopics(), "GET", "/api/question-bank/topics", {}],
    ["createQuestion", () => exams.createQuestion({} as never), "POST", "/api/question-bank", undefined],
    ["updateQuestion", () => exams.updateQuestion("q1", {} as never), "PUT", "/api/question-bank/q1", undefined],
    ["duplicateQuestion", () => exams.duplicateQuestion("q1"), "POST", "/api/question-bank/q1/duplicate", undefined],
    ["deleteQuestions", () => exams.deleteQuestions(["q1"]), "POST", "/api/question-bank/bulk-delete", undefined],
    ["importQuestions", () => exams.importQuestions([]), "POST", "/api/question-bank/import", undefined],
    ["getOnlineExamDashboard", () => exams.getOnlineExamDashboard(), "GET", "/api/online-exams/dashboard", undefined],
    ["listOnlineExams", () => exams.listOnlineExams({ status: "Scheduled", search: null } as never), "GET", "/api/online-exams", { status: "Scheduled" }],
    ["getOnlineExam", () => exams.getOnlineExam("e1"), "GET", "/api/online-exams/e1", undefined],
    ["listAssignableStudents", () => exams.listAssignableStudents("c5"), "GET", "/api/online-exams/assignable-students", { classId: "c5" }],
    ["getAuthoringOptions", () => exams.getAuthoringOptions(), "GET", "/api/online-exams/authoring-options", undefined],
    ["createOnlineExam", () => exams.createOnlineExam({} as never), "POST", "/api/online-exams", undefined],
    ["updateOnlineExam", () => exams.updateOnlineExam("e1", {} as never), "PUT", "/api/online-exams/e1", undefined],
    ["deleteOnlineExam", () => exams.deleteOnlineExam("e1"), "DELETE", "/api/online-exams/e1", undefined],
    ["duplicateOnlineExam", () => exams.duplicateOnlineExam("e1"), "POST", "/api/online-exams/e1/duplicate", undefined],
    ["scheduleOnlineExam", () => exams.scheduleOnlineExam("e1", true), "POST", "/api/online-exams/e1/schedule", undefined],
    ["cancelOnlineExam", () => exams.cancelOnlineExam("e1"), "POST", "/api/online-exams/e1/cancel", undefined],
    ["publishExamResults", () => exams.publishExamResults("e1"), "POST", "/api/online-exams/e1/publish-results", undefined],
    ["getExamResults", () => exams.getExamResults("e1"), "GET", "/api/online-exams/e1/results", undefined],
    ["getExamAnalysis", () => exams.getExamAnalysis("e1"), "GET", "/api/online-exams/e1/analysis", undefined],
    ["getEvaluationQueue", () => exams.getEvaluationQueue(), "GET", "/api/online-exams/evaluations", undefined],
    ["getAttemptReview", () => exams.getAttemptReview("e1", "a1"), "GET", "/api/online-exams/e1/attempts/a1", undefined],
    ["saveEvaluations", () => exams.saveEvaluations("e1", "a1", []), "PUT", "/api/online-exams/e1/attempts/a1/evaluations", undefined],
    ["listMyExams", () => exams.listMyExams(), "GET", "/api/online-exams/my", undefined],
    ["startExam", () => exams.startExam("e1"), "POST", "/api/online-exams/e1/start", undefined],
    ["getExamSession", () => exams.getExamSession("e1"), "GET", "/api/online-exams/e1/session", undefined],
    ["saveAnswers", () => exams.saveAnswers("e1", []), "POST", "/api/online-exams/e1/answers", undefined],
    ["submitExam", () => exams.submitExam("e1", []), "POST", "/api/online-exams/e1/submit", undefined],
    ["getMyResult", () => exams.getMyResult("e1"), "GET", "/api/online-exams/e1/my-result", undefined],
  ] as const)("%s", async (_name, call, method, url, params) => {
    const calls = stubClient(academicHttpClient, any);

    await call();

    expect(calls[0]).toMatchObject({ method, url });
    if (params !== undefined) expect((calls[0].config as { params?: unknown }).params).toEqual(params);
  });

  it("sends bodies for schedule, cancel, bulk delete and submit", async () => {
    const calls = stubClient(academicHttpClient, any);

    await exams.scheduleOnlineExam("e1");
    await exams.cancelOnlineExam("e1", "Clash");
    await exams.deleteQuestions(["q1", "q2"]);
    await exams.submitExam("e1", [{ questionId: "q1" } as never]);

    expect(calls.map((c) => c.body)).toEqual([{ startNow: false }, { reason: "Clash" }, { ids: ["q1", "q2"] }, { answers: [{ questionId: "q1" }] }]);
  });

  it("keeps the HTTP status on errors so the exam player can react to it", async () => {
    vi.spyOn(academicHttpClient, "post").mockRejectedValue(apiError(409, { title: "Time is up" }));

    const error = await exams.saveAnswers("e1", []).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(exams.OnlineExamApiError);
    expect(error).toMatchObject({ message: "Time is up", status: 409 });
  });
});

describe("surveys api", () => {
  const survey = (overrides: Record<string, unknown> = {}) => ({
    id: "sv1", tenantId: "t", title: "Canteen", description: null, audience: "Parents", status: "Published", anonymousAllowed: true, opensAt: "2026-09-01",
    closesAt: null, createdByStaffId: "sf1", createdAt: "", responseCount: 3,
    questions: [{ id: "q1", text: "Rate", type: "Rating", options: [], required: true }, { id: "q2", text: "Pick", type: "MultipleChoice", options: ["A", "B"], required: false }],
    ...overrides,
  });
  const response = (overrides: Record<string, unknown> = {}) => ({
    id: "r1", tenantId: "t", surveyId: "sv1", respondentType: "Student", respondentStudentId: "st1", respondentStaffId: null, respondentName: null, submittedAt: "", answers: [], ...overrides,
  });

  it("lists, reads and changes surveys", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/Surveys": [survey(), survey({ id: "sv2", createdByStaffId: null })],
      "GET api/Surveys/sv1": survey(),
      "POST api/Surveys": survey({ status: "Draft" }),
      "POST api/Surveys/sv1/publish": survey(),
      "POST api/Surveys/sv1/close": survey({ status: "Closed" }),
      "DELETE api/Surveys/sv1": null,
    });

    const rows = await surveys.listSurveys("published");
    const one = await surveys.getSurvey("sv1");
    const created = await surveys.createSurvey({
      title: "Canteen", description: " ", audience: "all", anonymousAllowed: false, opensAt: "2026-09-01", closesAt: "", createdByStaffId: "",
      questions: [{ text: "Rate", type: "yes_no", required: true }],
    } as never);
    await surveys.publishSurvey("sv1");
    expect((await surveys.closeSurvey("sv1")).status).toBe("closed");
    await surveys.deleteSurvey("sv1");

    expect(rows[0]).toMatchObject({ audience: "parents", status: "published", responseCount: 3, createdBy: { firstName: "Meera" }, closesAt: undefined });
    expect(rows[1].createdBy).toBeUndefined();
    expect(one.questions.map((q) => [q.type, q.options])).toEqual([["rating", undefined], ["multiple_choice", ["A", "B"]]]);
    expect(created.status).toBe("draft");
    expect((calls[0].config as { params: unknown }).params).toEqual({ status: "Published" });
    expect(calls[2].body).toEqual({
      title: "Canteen", description: null, audience: "All", anonymousAllowed: false, opensAt: "2026-09-01", closesAt: null, createdByStaffId: null,
      questions: [{ text: "Rate", type: "YesNo", options: null, required: true }],
    });
  });

  it("responses carry a readable respondent label", async () => {
    const calls = stubClient(engagementHttpClient, {
      "GET api/Surveys/sv1/responses": [
        response(),
        response({ id: "r2", respondentType: "Staff", respondentStudentId: null, respondentStaffId: "sf1" }),
        response({ id: "r3", respondentType: "Parent", respondentName: " Mrs Nair " }),
        response({ id: "r4", respondentType: "Parent", respondentStudentId: null }),
        response({ id: "r5", respondentType: "Anonymous", respondentStudentId: null }),
        response({ id: "r6", respondentStudentId: "gone" }),
        response({ id: "r7", respondentType: "Staff", respondentStudentId: null, respondentStaffId: "gone" }),
      ],
      "POST api/SurveyResponses": response(),
      "DELETE api/SurveyResponses/r1": null,
    });

    const rows = await surveys.listResponses("sv1");
    await surveys.recordResponse({ surveyId: "sv1", respondentType: "anonymous", answers: [{ questionId: "q1", value: "5" }] } as never);
    await surveys.deleteResponse("r1");

    expect(rows.map((r) => r.respondentLabel)).toEqual([
      "Asha N (Class 5 - A)", "Meera Rao (Teacher)", "Mrs Nair (parent of Asha N)", "Parent/Guardian", "Anonymous", "Unknown student", "Unknown staff",
    ]);
    expect(calls[1].body).toEqual({ surveyId: "sv1", respondentType: "Anonymous", respondentStudentId: null, respondentStaffId: null, respondentName: null, answers: [{ questionId: "q1", value: "5" }] });
  });

  it("results and the reports summary", async () => {
    stubClient(engagementHttpClient, {
      "GET api/Surveys/sv1/results": {
        survey: survey(), responseCount: 2,
        questionResults: [
          { questionId: "q1", questionText: "Rate", type: "Rating", required: true, answeredCount: 2, ratingAverage: 4.5, ratingDistribution: [{ value: 5, count: 1 }], choiceCounts: null, yesCount: null, noCount: null, textResponses: null },
        ],
      },
      "GET api/Surveys/reports-summary": { totalSurveys: 1, responsesByAudience: [{ audience: "Staff", count: 4 }] },
    });

    const results = await surveys.getSurveyResults("sv1");
    const summary = await surveys.getSurveysReportsSummary();

    expect(results.questionResults[0]).toMatchObject({ type: "rating", ratingAverage: 4.5, choiceCounts: undefined, textResponses: undefined });
    expect(summary).toEqual({ totalSurveys: 1, responsesByAudience: [{ audience: "staff", count: 4 }] });
  });
});
