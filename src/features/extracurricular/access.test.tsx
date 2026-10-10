import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/authStore";
import { signIn, signOut } from "@/test/utils";
import type { ModulePermissions } from "@/types/auth";
import { academicYearLabel, useExtracurricularAccess } from "./shared";

const permissions = (extra: Record<string, boolean> = {}) => ({ extracurricular: true, ...extra }) as unknown as ModulePermissions;

afterEach(() => signOut());

describe("useExtracurricularAccess", () => {
  it("gives nothing without the module", () => {
    signIn("admin", {}, { extracurricular: false } as unknown as ModulePermissions);
    const { result } = renderHook(() => useExtracurricularAccess());
    expect(result.current).toMatchObject({ canView: false, canManage: false, canApprove: false, canTakeAttendance: false });
  });

  it("judges an older session (no Staff.Managed marker) by the module alone", () => {
    signIn("teacher", {}, permissions());
    const { result } = renderHook(() => useExtracurricularAccess());
    expect(result.current).toMatchObject({ canView: true, canManage: true, canApprove: true, canTakeAttendance: true, isFamily: false });
  });

  it("follows the school's staff actions once they are managed", () => {
    signIn("teacher", {}, permissions({ "Staff.Managed": true, "Extracurricular.Attendance": true }));
    const { result } = renderHook(() => useExtracurricularAccess());
    expect(result.current).toMatchObject({ canView: true, canManage: false, canApprove: false, canTakeAttendance: true });
  });

  it("never grants a parent or student any staff action, even if the token lists them", () => {
    signIn("parent", {}, permissions({ "Staff.Managed": true, "Extracurricular.Manage": true, "Extracurricular.Approve": true }));
    const { result } = renderHook(() => useExtracurricularAccess());
    expect(result.current).toMatchObject({ canView: true, canManage: false, canApprove: false, canTakeAttendance: false, isFamily: true });
    expect(useAuthStore.getState().user?.role).toBe("parent");
  });
});

describe("academicYearLabel", () => {
  it("starts the school year in June", () => {
    expect(academicYearLabel(new Date(2026, 5, 1))).toBe("2026-27");
    expect(academicYearLabel(new Date(2027, 2, 15))).toBe("2026-27");
    expect(academicYearLabel(new Date(2026, 4, 31))).toBe("2025-26");
  });

  it("rolls over the century correctly", () => {
    expect(academicYearLabel(new Date(2099, 8, 1))).toBe("2099-00");
  });
});
