import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import ReviewFormPage from "./ReviewFormPage";
import * as api from "../api";
import type { ReviewForm } from "../types";

vi.mock("../api");

const form: ReviewForm = {
  assignmentId: "a1",
  cycleName: "Annual 2026",
  reviewerGroup: "student",
  appraisee: "Asha Nair",
  context: "Class 8 · Maths",
  deadline: "2026-12-01",
  anonymous: true,
  commentsRequired: false,
  canEdit: true,
  allowResubmission: false,
  scale: [1, 2, 3, 4, 5].map((value) => ({ value, label: `Level ${value}` })),
  draft: [],
  questions: [
    { id: "q1", criterion: "Teaching quality", text: "Explains concepts clearly", type: "Rating", required: true, allowNotApplicable: false, allowComment: false },
    { id: "q2", criterion: "Teaching quality", text: "Anything to add?", type: "Comment", required: false, allowNotApplicable: false, allowComment: false },
  ],
};

beforeEach(() => {
  signIn("student", {}, { appraisal: true } as never);
  vi.mocked(api.getReviewForm).mockResolvedValue(form);
  vi.mocked(api.submitReview).mockResolvedValue(undefined);
  vi.mocked(api.saveDraft).mockResolvedValue(undefined);
});
afterEach(() => {
  signOut();
  vi.resetAllMocks();
});

const renderForm = () =>
  renderWithProviders(
    <Routes>
      <Route path="/appraisal/review/:assignmentId" element={<ReviewFormPage />} />
    </Routes>,
    { route: "/appraisal/review/a1" },
  );

describe("ReviewFormPage", () => {
  it("shows the appraisee, the anonymity note and no scoring information", async () => {
    renderForm();
    expect(await screen.findByText("Asha Nair")).toBeInTheDocument();
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.queryByText(/weight/i)).not.toBeInTheDocument();
  });

  it("refuses to submit until the required question is answered, then sends the answers", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByText("Asha Nair");

    await user.click(screen.getByRole("button", { name: /submit review/i }));
    expect(api.submitReview).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/needs an answer/i)).not.toHaveLength(0);

    await user.click(screen.getByLabelText(/4\s*Level 4/));
    await user.click(screen.getByRole("button", { name: /submit review/i }));
    await waitFor(() => expect(api.submitReview).toHaveBeenCalledWith("a1", [{ questionId: "q1", rating: 4, text: undefined }]));
    expect(await screen.findByText("Review submitted")).toBeInTheDocument();
  });

  it("saves a draft without validating", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByText("Asha Nair");
    await user.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledWith("a1", []));
  });

  it("says so when the review can't be opened", async () => {
    vi.mocked(api.getReviewForm).mockRejectedValue(new Error("not found"));
    renderForm();
    expect(await screen.findByText(/can't be opened/i)).toBeInTheDocument();
  });
});
