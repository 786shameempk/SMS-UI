import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import * as api from "../api";
import ProgressPage from "./ProgressPage";
import type { SectionSyllabus, TeachingClass } from "../types";

vi.mock("../api");
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const today = new Date().toISOString().slice(0, 10);

const mine: TeachingClass[] = [
  { syllabusPlanId: "plan-1", classId: "c5", className: "Class 5", sectionId: "sec-a", sectionName: "A", subjectId: "math", subjectName: "Mathematics", syllabusTitle: "Maths 5", percent: 40, plannedPercent: 55, risk: "Behind", lastUpdatedOn: today, pendingUpdates: 2 },
];

const syllabus = (over: Partial<SectionSyllabus> = {}): SectionSyllabus => ({
  syllabusPlanId: "plan-1",
  syllabusTitle: "Maths 5",
  sectionId: "sec-a",
  className: "Class 5",
  sectionName: "A",
  subjectId: "math",
  subjectName: "Mathematics",
  syllabusStatus: "Published",
  canUpdate: true,
  plannedPercent: 50,
  completion: { totalChapters: 1, completedChapters: 0, inProgressChapters: 1, delayedChapters: 0, pendingChapters: 0, totalTopics: 2, completedTopics: 0, plannedPeriods: 6, remainingPeriods: 6, chapterPercent: 0, topicPercent: 0, periodPercent: 0, weightedPercent: 0, percent: 0, chapters: [] },
  chapters: [
    {
      chapterId: "ch-1",
      sequence: 1,
      title: "Numbers",
      deadline: "2026-12-01",
      status: "InProgress",
      percent: 0,
      overdue: false,
      topics: [
        { topicId: "t-1", chapterId: "ch-1", title: "Place value", sequence: 1, plannedPeriods: 3, status: "NotStarted", periodsUsed: 0, rowVersion: null, progressId: null },
        { topicId: "t-2", chapterId: "ch-1", title: "Rounding", sequence: 2, plannedPeriods: 3, status: "Completed", periodsUsed: 3, taughtOn: today, progressId: "p-2", rowVersion: "AAA=" },
      ],
    },
  ],
  ...over,
});

beforeEach(() => {
  vi.mocked(api.myTeachingClasses).mockResolvedValue(mine);
  vi.mocked(api.pendingUpdates).mockResolvedValue([]);
  vi.mocked(api.sectionSyllabus).mockResolvedValue(syllabus());
  signIn("teacher", {}, { portions: true, "Staff.Managed": true, "Portions.Progress": true } as unknown as ModulePermissions);
});
afterEach(() => {
  signOut();
  vi.clearAllMocks();
});

describe("ProgressPage", () => {
  it("lists the teacher's classes with how far each syllabus has got", async () => {
    renderWithProviders(<ProgressPage />);
    expect(await screen.findByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByText("Class 5 A")).toBeInTheDocument();
    expect(screen.getByText("Behind")).toBeInTheDocument();
    expect(screen.getByText("2 to record")).toBeInTheDocument();
  });

  it("says so when the teacher has no classes", async () => {
    vi.mocked(api.myTeachingClasses).mockResolvedValue([]);
    renderWithProviders(<ProgressPage />);
    expect(await screen.findByText("No classes to update yet")).toBeInTheDocument();
  });

  it("shows an error with a retry when the classes can't be loaded", async () => {
    vi.mocked(api.myTeachingClasses).mockRejectedValue(new Error("down"));
    renderWithProviders(<ProgressPage />);
    expect(await screen.findByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });

  it("records a topic: validates, then saves with the row version and closes", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateProgress).mockResolvedValue({ topicId: "t-1", chapterId: "ch-1", title: "Place value", sequence: 1, plannedPeriods: 3, status: "InProgress", progressId: "p-1", periodsUsed: 2, rowVersion: "BBB=" });
    renderWithProviders(<ProgressPage />, { route: "/?plan=plan-1&section=sec-a" });

    // The first chapter still to teach is open; the topic with nothing recorded offers Record.
    await user.click(await screen.findByRole("button", { name: /record/i }));
    const dialog = await screen.findByRole("dialog");

    const date = within(dialog).getByLabelText(/date taught/i);
    await user.clear(date);
    await user.type(date, "2999-01-01");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));
    expect(await within(dialog).findByText("The date can't be in the future")).toBeInTheDocument();
    expect(api.updateProgress).not.toHaveBeenCalled();

    await user.clear(date);
    await user.type(date, today);
    await user.clear(within(dialog).getByLabelText(/periods used/i));
    await user.type(within(dialog).getByLabelText(/periods used/i), "2");
    await user.type(within(dialog).getByLabelText(/homework/i), "Exercise 1.2");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(api.updateProgress).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.updateProgress).mock.calls[0][0]).toMatchObject({ sectionId: "sec-a", syllabusTopicId: "t-1", status: "InProgress", taughtOn: today, periodsUsed: 2, homework: "Exercise 1.2", rowVersion: null });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does not offer to change a completed topic to a teacher", async () => {
    renderWithProviders(<ProgressPage />, { route: "/?plan=plan-1&section=sec-a" });
    await screen.findByText("Rounding");
    expect(screen.getAllByRole("button", { name: /record|update/i })).toHaveLength(1); // only "Place value"
    expect(screen.queryByRole("button", { name: /correct rounding/i })).not.toBeInTheDocument();
  });

  it("is view-only when the syllabus isn't the teacher's to update", async () => {
    vi.mocked(api.sectionSyllabus).mockResolvedValue(syllabus({ canUpdate: false }));
    renderWithProviders(<ProgressPage />, { route: "/?plan=plan-1&section=sec-a" });
    expect(await screen.findByText("View only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark chapter taught/i })).not.toBeInTheDocument();
  });
});
