import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import * as api from "../api";
import FamilyPage from "./FamilyPage";
import type { FamilyOverview } from "../types";

vi.mock("../api");

const overview = (over: Partial<FamilyOverview> = {}): FamilyOverview => ({
  enabled: true,
  studentId: "s1",
  studentName: "Asha Nair",
  className: "Class 5",
  sectionName: "A",
  subjects: [
    {
      syllabusPlanId: "p1",
      subjectId: "math",
      subjectName: "Mathematics",
      percent: 42.5,
      completedChapters: 2,
      totalChapters: 5,
      currentTopic: "Fractions",
      upcomingTopics: ["Decimals"],
      chapters: [{ id: "c1", title: "Numbers", status: "Completed", percent: 100, topics: [{ id: "t1", title: "Place value", status: "Completed", homework: "Page 4", resources: [{ id: "r1", kind: "Link", title: "Khan Academy", url: "https://example.org/place-value", visibleToFamilies: true }] }] }],
    },
  ],
  exams: [{ examId: "e1", examName: "Mid term", startDate: "2026-11-02", endDate: "2026-11-06", subjects: [{ subjectId: "math", subjectName: "Mathematics", chapters: ["Numbers"], topics: ["Fractions"] }] }],
  ...over,
});

beforeEach(() => signIn("parent", {}, { portions: true } as unknown as ModulePermissions));
afterEach(() => {
  signOut();
  vi.clearAllMocks();
});

describe("FamilyPage", () => {
  it("shows what is being taught now, what is next and the exam syllabus", async () => {
    vi.mocked(api.familyOverview).mockResolvedValue([overview()]);
    renderWithProviders(<FamilyPage />);

    expect(await screen.findByRole("heading", { name: "Mathematics" })).toBeInTheDocument();
    expect(screen.getByText("2 of 5 chapters")).toBeInTheDocument();
    expect(screen.getByText("Fractions", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("Decimals")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Exam syllabus" })).toBeInTheDocument();
    expect(screen.getByText("Mid term")).toBeInTheDocument();
  });

  it("reveals the chapters, homework and a safe link on request", async () => {
    vi.mocked(api.familyOverview).mockResolvedValue([overview()]);
    renderWithProviders(<FamilyPage />);
    await userEvent.click(await screen.findByRole("button", { name: /show chapters/i }));

    expect(screen.getByText("Homework: Page 4")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /khan academy/i });
    expect(link).toHaveAttribute("href", "https://example.org/place-value");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("lets a parent with several children switch between them", async () => {
    vi.mocked(api.familyOverview).mockResolvedValue([overview(), overview({ studentId: "s2", studentName: "Ravi Nair", className: "Class 3", subjects: [] })]);
    renderWithProviders(<FamilyPage />);
    expect(await screen.findByLabelText("Student")).toBeInTheDocument();
    expect(screen.getByText("Asha Nair · Class 5 A", { selector: "p" })).toBeInTheDocument();
  });

  it("explains when the school hasn't turned the view on", async () => {
    vi.mocked(api.familyOverview).mockResolvedValue([overview({ enabled: false, subjects: [], exams: [] })]);
    renderWithProviders(<FamilyPage />);
    expect(await screen.findByText("Syllabus progress isn't shown yet")).toBeInTheDocument();
  });

  it("explains when no student is linked to the login", async () => {
    vi.mocked(api.familyOverview).mockResolvedValue([]);
    renderWithProviders(<FamilyPage />);
    expect(await screen.findByText("No student linked to this login")).toBeInTheDocument();
  });

  it("shows an error with a retry when the view can't be loaded", async () => {
    vi.mocked(api.familyOverview).mockRejectedValue(new Error("down"));
    renderWithProviders(<FamilyPage />);
    expect(await screen.findByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });
});
