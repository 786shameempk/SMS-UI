import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import AppraisalLayout from "./components/AppraisalLayout";
import { resolveAppraisalAccess } from "./shared";

const perms = (extra: Record<string, boolean> = {}) => ({ appraisal: true, ...extra }) as unknown as ModulePermissions;

afterEach(() => signOut());

describe("resolveAppraisalAccess", () => {
  it("gives nothing when the module isn't in the school's plan", () => {
    const a = resolveAppraisalAccess({ appraisal: false }, "admin");
    expect(a).toMatchObject({ canView: false, canSubmit: false, canConfigure: false, seesCycles: false });
  });

  it("judges an older session by the module: staff submit and see their own, leaders manage", () => {
    expect(resolveAppraisalAccess({ appraisal: true }, "teacher")).toMatchObject({ canSubmit: true, canViewOwn: true, canConfigure: false, canManageCycles: false, canViewScores: false, canViewReviewerIdentity: false, seesCycles: false });
    expect(resolveAppraisalAccess({ appraisal: true }, "principal")).toMatchObject({ canSubmit: true, canConfigure: true, canManageCycles: true, canFinalize: true, canViewScores: true, canViewComments: true, canViewReviewerIdentity: true, canExport: true, seesCycles: true });
  });

  it("follows the school's explicit actions once they are managed, and keeps scores, comments and identities separate", () => {
    const a = resolveAppraisalAccess({ appraisal: true, "Staff.Managed": true, "Appraisal.ViewReports": true, "Appraisal.ViewScores": true }, "teacher");
    expect(a).toMatchObject({ canViewReports: true, canViewScores: true, seesCycles: true, canViewComments: false, canViewReviewerIdentity: false, canExport: false, canSubmit: false, canConfigure: false });
  });

  it("never gives a parent or student a staff action, only the feedback assigned to them", () => {
    const a = resolveAppraisalAccess({ appraisal: true, "Staff.Managed": true, "Appraisal.Configure": true, "Appraisal.ViewScores": true, "Appraisal.Finalize": true }, "parent");
    expect(a).toMatchObject({ isFamily: true, canSubmit: true, canConfigure: false, canViewScores: false, canFinalize: false, canViewComments: false, canViewReviewerIdentity: false, seesCycles: false, canViewOwn: false });
    expect(resolveAppraisalAccess({ appraisal: true }, "student")).toMatchObject({ isFamily: true, canSubmit: true, seesCycles: false });
  });
});

describe("AppraisalLayout", () => {
  const renderAt = (route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/appraisal" element={<AppraisalLayout />}>
          <Route path="dashboard" element={<p>dashboard page</p>} />
          <Route path="pending" element={<p>pending page</p>} />
          <Route path="mine" element={<p>mine page</p>} />
          <Route path="configuration" element={<p>configuration page</p>} />
          <Route path="reports" element={<p>reports page</p>} />
          <Route path="cycles" element={<p>cycles page</p>} />
        </Route>
        <Route path="/dashboard" element={<p>app dashboard</p>} />
      </Routes>,
      { route },
    );

  it("shows a teacher only their own work", () => {
    signIn("teacher", {}, perms());
    renderAt("/appraisal/pending");
    expect(screen.getByRole("link", { name: "Pending reviews" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My appraisals" })).toBeInTheDocument();
    for (const name of ["Dashboard", "Appraisal cycles", "Configuration", "Results & reports", "Criteria & questions"]) {
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("sends a teacher who types the configuration address back to their own page", () => {
    signIn("teacher", {}, perms());
    renderAt("/appraisal/configuration");
    expect(screen.queryByText("configuration page")).not.toBeInTheDocument();
    expect(screen.getByText("pending page")).toBeInTheDocument();
  });

  it("gives a principal every section", () => {
    signIn("principal", {}, perms());
    renderAt("/appraisal/dashboard");
    for (const name of ["Dashboard", "Pending reviews", "My appraisals", "Appraisal cycles", "Criteria & questions", "Configuration", "Results & reports", "History"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("gives a student only the feedback page and no tab bar", () => {
    signIn("student", {}, perms({ "Staff.Managed": true, "Appraisal.Configure": true }));
    renderAt("/appraisal/pending");
    expect(screen.getByText("pending page")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Appraisal sections" })).not.toBeInTheDocument();
    expect(screen.getByText("Teacher feedback")).toBeInTheDocument();
  });

  it("keeps a parent out of the management pages", () => {
    signIn("parent", {}, perms());
    renderAt("/appraisal/reports");
    expect(screen.queryByText("reports page")).not.toBeInTheDocument();
    expect(screen.getByText("pending page")).toBeInTheDocument();
  });
});
