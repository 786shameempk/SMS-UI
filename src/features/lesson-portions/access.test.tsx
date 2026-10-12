import { renderHook, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { signIn, signOut, renderWithProviders } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import PortionsLayout from "./components/PortionsLayout";
import { ProgressBar, formatDate, pct, usePortionAccess } from "./shared";

const perms = (extra: Record<string, boolean> = {}) => ({ portions: true, ...extra }) as unknown as ModulePermissions;

afterEach(() => signOut());

describe("usePortionAccess", () => {
  it("gives nothing without the module in the school's plan", () => {
    signIn("admin", {}, { portions: false } as unknown as ModulePermissions);
    const { result } = renderHook(() => usePortionAccess());
    expect(result.current).toMatchObject({ canView: false, canManage: false, canPlan: false, canProgress: false, canApprove: false, canReport: false, seesAll: false });
  });

  it("judges an older session (no Staff.Managed marker) by the module, keeping management for school leaders", () => {
    signIn("teacher", {}, perms());
    const teacher = renderHook(() => usePortionAccess()).result.current;
    expect(teacher).toMatchObject({ canPlan: true, canProgress: true, canManage: false, canApprove: false, canReport: false, seesAll: false });

    signOut();
    signIn("principal", {}, perms());
    expect(renderHook(() => usePortionAccess()).result.current).toMatchObject({ canPlan: true, canProgress: true, canManage: true, canApprove: true, canReport: true, seesAll: true });
  });

  it("follows the school's explicit actions once they are managed", () => {
    signIn("teacher", {}, perms({ "Staff.Managed": true, "Portions.Plan": true, "Portions.Approve": true }));
    const { result } = renderHook(() => usePortionAccess());
    expect(result.current).toMatchObject({ canPlan: true, canProgress: false, canApprove: true, canManage: false, canReport: false, seesAll: true });
  });

  it("never grants a parent or student any staff action, even if the token lists them", () => {
    signIn("parent", {}, perms({ "Staff.Managed": true, "Portions.Manage": true, "Portions.Approve": true, "Portions.Plan": true }));
    const { result } = renderHook(() => usePortionAccess());
    expect(result.current).toMatchObject({ canView: true, isFamily: true, canManage: false, canApprove: false, canPlan: false, canProgress: false, seesAll: false });
  });
});

describe("PortionsLayout", () => {
  const renderAt = (route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/lesson-portions" element={<PortionsLayout />}>
          <Route index element={<p>overview page</p>} />
          <Route path="approvals" element={<p>approvals page</p>} />
          <Route path="family" element={<p>family page</p>} />
        </Route>
      </Routes>,
      { route },
    );

  it("shows a teacher only the tabs their actions allow", () => {
    signIn("teacher", {}, perms({ "Staff.Managed": true, "Portions.Plan": true }));
    renderAt("/lesson-portions");
    expect(screen.getByRole("link", { name: "My plan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Daily progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teacher report" })).not.toBeInTheDocument();
  });

  it("sends a teacher who types the approvals address back to the overview", () => {
    signIn("teacher", {}, perms({ "Staff.Managed": true, "Portions.Plan": true }));
    renderAt("/lesson-portions/approvals");
    expect(screen.getByText("overview page")).toBeInTheDocument();
    expect(screen.queryByText("approvals page")).not.toBeInTheDocument();
  });

  it("gives a principal every tab", () => {
    signIn("principal", {}, perms());
    renderAt("/lesson-portions");
    for (const name of ["Overview", "My plan", "Daily progress", "Calendar", "Class tracking", "Approvals", "Syllabus", "Exam portions", "Subject report", "Teacher report", "Resources", "Settings"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("takes a parent straight to the read-only view and a teacher away from it", () => {
    signIn("parent", {}, perms());
    const { unmount } = renderAt("/lesson-portions");
    expect(screen.getByText("family page")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My plan" })).not.toBeInTheDocument();
    unmount();

    signOut();
    signIn("teacher", {}, perms());
    renderAt("/lesson-portions/family");
    expect(screen.getByText("overview page")).toBeInTheDocument();
  });
});

describe("ProgressBar and formatting", () => {
  it("exposes the completion and the planned position to assistive technology", () => {
    renderWithProviders(<ProgressBar percent={58.3} planned={65} risk="Behind" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "58");
    expect(bar).toHaveAccessibleName("Completion 58.3%, planned 65%");
  });

  it("clamps out-of-range values", () => {
    renderWithProviders(<ProgressBar percent={140} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("formats percentages and dates", () => {
    expect(pct(58.30000001)).toBe("58.3%");
    expect(pct(40)).toBe("40%");
    expect(pct(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("2026-09-14")).toContain("2026");
  });
});
