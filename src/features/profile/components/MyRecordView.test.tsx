import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import type { Student } from "@/features/students/types";
import type { StaffMember } from "@/features/staff/types";
import { MyStaffRecord, MyStudentRecord } from "./MyRecordView";

const students = vi.hoisted(() => ({ getMyStudentRecord: vi.fn() }));
const staffApi = vi.hoisted(() => ({ getMyStaffRecord: vi.fn(), getMyStaffAttendance: vi.fn(), getStaffAttendance: vi.fn() }));
vi.mock("@/features/students/api", () => students);
vi.mock("@/features/staff/api", () => staffApi);

const student = {
  id: "st1", firstName: "Ravi", lastName: "Kumar", status: "active", className: "Grade 1", section: "A", admissionNumber: "ADM-1", rollNumber: "7",
  dateOfBirth: "2018-04-02", gender: "male", admissionDate: "2024-06-01", address: "12 Lake Road",
  guardians: [{ id: "g1", name: "Meera Kumar", relation: "mother", phone: "9876500000", email: "" }],
  emergencyContact: { name: "Meera Kumar", relation: "Mother", phone: "9876500000" },
  medical: { bloodGroup: "O+", allergies: "Peanuts", conditions: "", medications: "", doctorName: "", doctorPhone: "" },
  transport: { required: false }, hostel: { required: false },
  documents: [{ id: "d1", name: "Birth certificate.pdf", category: "birth_certificate", uploadedAt: "2024-06-01", fileDataUrl: "https://files.example/d1" }],
} as unknown as Student;

const staff = {
  id: "t1", tenantId: "x", branchId: "b", employeeId: "EMP-1001", firstName: "Asha", lastName: "Nair", designation: "Teacher", department: "Science", status: "active",
  joiningDate: "2020-06-01", dateOfBirth: "1990-01-01", gender: "female", phone: "9876543210", email: "asha@school.example", address: "1 Old Road",
  qualifications: [{ id: "q1", degree: "M.Sc", institution: "City College", yearCompleted: 2012 }], experience: [],
  salary: { basic: 30000, allowances: 5000, deductions: 1000, bankName: "SBI", bankAccountNumber: "1234", effectiveFrom: "2024-04-01" },
  salaryHistory: [], documents: [], performanceReviews: [], promotions: [],
} as unknown as StaffMember;

beforeEach(() => vi.clearAllMocks());

describe("My profile record views", () => {
  it("shows the student detail tabs with no way to change anything", async () => {
    students.getMyStudentRecord.mockResolvedValue(student);
    const user = userEvent.setup();
    renderWithProviders(<MyStudentRecord personId="st1" />);

    expect(await screen.findByRole("heading", { name: "Ravi Kumar" })).toBeInTheDocument();
    expect(students.getMyStudentRecord).toHaveBeenCalledWith("st1");
    expect(screen.queryByRole("button", { name: "Change student photo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Guardian & Emergency" }));
    expect(screen.getByText(/Meera Kumar/, { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add guardian/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Save emergency contact/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Medical" }));
    expect(screen.getByLabelText("Allergies")).toHaveValue("Peanuts");
    expect(screen.getByLabelText("Allergies")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Save medical information/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Documents" }));
    expect(screen.getByRole("link", { name: "Birth certificate.pdf" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Upload document/ })).not.toBeInTheDocument();
  });

  it("shows the staff detail tabs read-only, with the person's own salary and attendance", async () => {
    staffApi.getMyStaffRecord.mockResolvedValue(staff);
    staffApi.getMyStaffAttendance.mockResolvedValue({ presentDays: 2, absentDays: 0, lateDays: 0, totalDays: 2, recent: [] });
    const user = userEvent.setup();
    renderWithProviders(<MyStaffRecord personId="t1" />);

    expect(await screen.findByRole("heading", { name: "Asha Nair" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change staff photo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Qualifications & Experience" }));
    expect(screen.getByText("M.Sc")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Salary" }));
    expect(screen.getByLabelText("Basic")).toHaveValue(30000);
    expect(screen.getByLabelText("Basic")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Save salary structure|Record this month/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Attendance" }));
    expect(await screen.findByText(/100% present/)).toBeInTheDocument();
    expect(staffApi.getMyStaffAttendance).toHaveBeenCalledWith("t1");
    expect(staffApi.getStaffAttendance).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "Performance" }));
    expect(screen.queryByRole("button", { name: /Add review/ })).not.toBeInTheDocument();
  });

  it("offers a retry when the record cannot be loaded", async () => {
    students.getMyStudentRecord.mockRejectedValue(new Error("down"));
    renderWithProviders(<MyStudentRecord personId="st1" />);
    expect(await screen.findByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });
});
