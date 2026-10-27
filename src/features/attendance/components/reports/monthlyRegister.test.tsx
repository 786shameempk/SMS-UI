import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import MonthlyAttendanceReport from "./MonthlyAttendanceReport";
import MonthlyRegisterGrid from "./MonthlyRegisterGrid";
import { STATUS_CODE, daysInMonth, isSunday, monthlyRegisterCsv, weekdayLetter } from "./monthlyRegister";
import type { MonthlyStudentRow } from "../../types";

const api = vi.hoisted(() => ({ getMonthlyStudentSummary: vi.fn(), listRosterSections: vi.fn() }));
vi.mock("../../api", () => api);
const academics = vi.hoisted(() => ({ listClasses: vi.fn(), listSections: vi.fn() }));
vi.mock("@/features/academics/api", () => academics);
vi.mock("./PrintRegisterButton", () => ({ default: () => <button type="button">Print register</button> }));

const row = (over: Partial<MonthlyStudentRow> = {}): MonthlyStudentRow => ({
  studentId: "s1", name: "Asha Nair", rollNumber: "1", statusByDay: { 1: "present", 2: "absent", 3: "late", 4: "half-day", 5: "leave" },
  presentDays: 1, absentDays: 1, lateDays: 1, halfDays: 1, leaveDays: 1, markedDays: 5, percentPresent: 60, ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  academics.listClasses.mockResolvedValue([{ id: "c5", name: "Class 5" }, { id: "c6", name: "Class 6" }]);
  academics.listSections.mockResolvedValue([{ id: "s5a", classId: "c5", name: "A" }, { id: "s5b", classId: "c5", name: "B" }, { id: "s6a", classId: "c6", name: "A" }]);
  api.listRosterSections.mockResolvedValue([{ sectionId: "s5a", classId: "c5", studentCount: 30 }, { sectionId: "s5b", classId: "c5", studentCount: 28 }, { sectionId: "s6a", classId: "c6", studentCount: 25 }]);
  api.getMonthlyStudentSummary.mockResolvedValue([row()]);
});

describe("register helpers", () => {
  it("knows the length of each month and the weekday of each date", () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 9)).toBe(31);
    expect(weekdayLetter(2026, 9, 27)).toBe("T");     // Tuesday 27 October 2026
    expect(isSunday(2026, 9, 25)).toBe(true);
    expect(isSunday(2026, 9, 26)).toBe(false);
  });

  it("writes a sheet with a column per date, the status letter in each cell and the totals", () => {
    const { headers, lines } = monthlyRegisterCsv([row()], 2026, 9);

    expect(headers.slice(0, 4)).toEqual(["Roll", "Student", "2026-10-01", "2026-10-02"]);
    expect(headers).toHaveLength(2 + 31 + 7);
    expect(lines[0].slice(0, 7)).toEqual(["1", "Asha Nair", "P", "A", "L", "H", "V"]);
    expect(lines[0][7]).toBe("");                           // a day nobody marked is left blank
    expect(lines[0].slice(-7)).toEqual([1, 1, 1, 1, 1, 5, 60]);
    expect(Object.values(STATUS_CODE)).toEqual(["P", "A", "L", "H", "V"]);
  });
});

describe("the monthly register", () => {
  it("shows each student by name against every date of the month, with letters and totals", async () => {
    renderWithProviders(<MonthlyRegisterGrid sectionId="s5a" label="Class 5 / A" year={2026} month={10} />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Asha Nair")).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader").length).toBe(1 + 31 + 4);     // student, 31 dates, P / A / L / %
    for (const letter of ["P", "A", "L", "H", "V"]) expect(within(table).getAllByText(letter).length).toBeGreaterThan(0);
    expect(within(table).getByText("60%")).toBeInTheDocument();
    expect(api.getMonthlyStudentSummary).toHaveBeenCalledWith("s5a", 2026, 9);
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });

  it("says so when there is nothing for the month and offers no download", async () => {
    api.getMonthlyStudentSummary.mockResolvedValue([]);
    renderWithProviders(<MonthlyRegisterGrid sectionId="s5a" label="Class 5 / A" year={2026} month={10} />);

    expect(await screen.findByText("No records for this section / month.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  });

  it("shows a load failure with a retry instead of an empty register", async () => {
    api.getMonthlyStudentSummary.mockRejectedValue(new Error("down"));
    renderWithProviders(<MonthlyRegisterGrid sectionId="s5a" label="Class 5 / A" year={2026} month={10} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("This register could not be loaded.");
  });

  it("shows one register per class and section when All classes is chosen", async () => {
    renderWithProviders(<MonthlyAttendanceReport />);
    await screen.findByRole("region", { name: "Class 5 / A" });

    // The first class is chosen; switch to every class.
    const user = (await import("@testing-library/user-event")).default;
    await user.click(screen.getByRole("combobox", { name: "Class" }));
    await user.click(await screen.findByRole("option", { name: "All classes" }));

    expect(await screen.findByRole("region", { name: "Class 5 / B" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Class 5 / A" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Class 6 / A" })).toBeInTheDocument();
    expect(screen.getByText(/30 students/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Section" })).not.toBeInTheDocument();
    expect(api.getMonthlyStudentSummary).toHaveBeenCalledWith("s6a", expect.any(Number), expect.any(Number));
  });
});
