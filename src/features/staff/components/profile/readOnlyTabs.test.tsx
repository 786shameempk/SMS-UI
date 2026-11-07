import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/utils";
import PerformanceTab from "./PerformanceTab";
import SalaryTab from "./SalaryTab";
import type { StaffMember } from "../../types";

const staff = {
  id: "s1", firstName: "Tara", lastName: "Menon",
  salary: { basic: 1000, allowances: 100, deductions: 50, effectiveFrom: "2026-01-01" },
  salaryHistory: [], performanceReviews: [],
} as unknown as StaffMember;

describe("Salary and Performance tabs read-only (a teacher viewing the Teachers page)", () => {
  it("shows the salary but no way to change it or record a payment", () => {
    renderWithProviders(<SalaryTab staff={staff} readOnly />);

    expect(screen.getByLabelText("Basic")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save salary structure" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /payment/i })).not.toBeInTheDocument();
  });

  it("shows the reviews but no way to add one", () => {
    renderWithProviders(<PerformanceTab staff={staff} readOnly />);

    expect(screen.queryByRole("button", { name: /add review/i })).not.toBeInTheDocument();
  });

  it("still lets an editor change both", () => {
    renderWithProviders(
      <>
        <SalaryTab staff={staff} />
        <PerformanceTab staff={staff} />
      </>,
    );

    expect(screen.getByLabelText("Basic")).toBeEnabled();
    expect(screen.getByRole("button", { name: /add review/i })).toBeInTheDocument();
  });
});
