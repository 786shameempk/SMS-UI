import * as staff from "./api";
import { academicHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";

vi.mock("@/features/attendance/api", () => ({
  listStaffAttendanceRecords: vi.fn(async () =>
    [
      ...Array.from({ length: 16 }, (_, i) => ({ staffId: "sf1", date: `2026-09-${String(i + 10).padStart(2, "0")}`, status: i % 4 === 0 ? "absent" : i % 5 === 0 ? "late" : "present" })),
      { staffId: "other", date: "2026-09-01", status: "present" },
    ].reverse(),
  ),
}));

const apiStaff = (overrides: Record<string, unknown> = {}) => ({
  id: "sf1", tenantId: "t", branchId: "b", employeeId: "EMP-1", firstName: "Meera", lastName: "Rao", photoUrl: null,
  designation: "VicePrincipal", department: "Admin", status: "OnLeave", joiningDate: "2020-06-01", dateOfBirth: "1985-01-01",
  gender: "Female", phone: "1", email: "m@x", address: "Kochi",
  qualifications: [{ id: "q1", degree: "MSc", institution: "CUSAT", yearCompleted: 2008 }],
  experience: [{ id: "x1", organization: "ABC", role: "Teacher", fromYear: 2010, toYear: null, description: null }],
  salary: { basic: 50000, allowances: 5000, deductions: 2000, bankName: null, bankAccountNumber: "123", effectiveFrom: "2026-04-01" },
  salaryHistory: [{ id: "p1", month: "2026-08", amountPaid: 53000, paidOn: "2026-08-31" }],
  documents: [{ id: "d1", name: "Resume", category: "Resume", uploadedAt: "", fileDataUrl: "api/people-files/d1?sig=x" }, { id: "d2", name: "?", category: "?", uploadedAt: "", fileDataUrl: null }],
  performanceReviews: [{ id: "r1", reviewDate: "2026-03-31", reviewerName: "P", rating: 4, comments: "Good" }],
  promotions: [{ id: "pr1", fromDesignation: "Teacher", toDesignation: "VicePrincipal", effectiveDate: "2024-06-01", remarks: null }],
  resignation: { resignedAt: "2026-09-01", lastWorkingDate: "2026-09-30", reason: "Relocating" },
  ...overrides,
});

const form = { branchId: "b", firstName: "Meera", lastName: "Rao", dateOfBirth: "1985-01-01", gender: "female", designation: "IT Support", department: "IT", phone: "1", email: "m@x", address: "Kochi" } as never;

describe("staff api", () => {
  it("maps the full staff profile", async () => {
    stubClient(academicHttpClient, { "GET /api/staff": [apiStaff(), apiStaff({ id: "sf2", designation: "?", status: "?", gender: "?", resignation: null })] });

    const [member, odd] = await staff.listStaff();

    expect(member).toMatchObject({
      designation: "Vice Principal", status: "on-leave", gender: "female", photoUrl: null,
      experience: [{ toYear: undefined, description: undefined }],
      salary: { bankName: undefined, bankAccountNumber: "123" },
      documents: [{ category: "resume" }, { category: "other", fileDataUrl: undefined }],
      promotions: [{ remarks: undefined }],
      resignation: { reason: "Relocating" },
    });
    expect(member.documents[0].fileDataUrl).toMatch(/^https?:.+\/api\/people-files\/d1\?sig=x$/);
    expect(odd).toMatchObject({ designation: "Teacher", status: "active", gender: "other", resignation: undefined });
  });

  it("creates, updates, promotes, resigns and reactivates", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/staff/sf1": apiStaff(),
      "POST /api/staff": apiStaff(),
      "PUT /api/staff/sf1": apiStaff(),
      "POST /api/staff/sf1/promote": apiStaff(),
      "POST /api/staff/sf1/resign": apiStaff(),
      "POST /api/staff/sf1/reactivate": apiStaff({ status: "Active", resignation: null }),
    });

    await staff.getStaffMember("sf1");
    await staff.createStaff(form);
    await staff.updateStaff("sf1", form);
    await staff.promoteStaff("sf1", { toDesignation: "Principal", effectiveDate: "2026-10-01" } as never);
    await staff.resignStaff("sf1", { lastWorkingDate: "2026-10-31", reason: "Moving" } as never);
    expect((await staff.reactivateStaff("sf1")).status).toBe("active");

    expect(calls[1].body).toMatchObject({ gender: "Female", designation: "ITSupport" });
    expect(calls[3].body).toEqual({ toDesignation: "Principal", effectiveDate: "2026-10-01", remarks: null });
    expect(calls[4].body).toEqual({ lastWorkingDate: "2026-10-31", reason: "Moving" });
  });

  it("profile sections: qualifications, experience, salary, reviews, documents, photo", async () => {
    const calls = stubClient(academicHttpClient, {
      "POST /api/staff/sf1/qualifications": apiStaff(),
      "DELETE /api/staff/sf1/qualifications/q1": apiStaff(),
      "POST /api/staff/sf1/experience": apiStaff(),
      "DELETE /api/staff/sf1/experience/x1": apiStaff(),
      "PUT /api/staff/sf1/salary": apiStaff(),
      "POST /api/staff/sf1/salary/payments": apiStaff(),
      "POST /api/staff/sf1/performance-reviews": apiStaff(),
      "POST /api/staff/sf1/documents": apiStaff(),
      "DELETE /api/staff/sf1/documents/d1": apiStaff(),
      "PUT /api/staff/sf1/photo": apiStaff(),
    });

    await staff.addQualification("sf1", { degree: "BEd", institution: "X", yearCompleted: 2009 } as never);
    await staff.removeQualification("sf1", "q1");
    await staff.addExperience("sf1", { organization: "ABC", role: "Teacher", fromYear: 2010 } as never);
    await staff.removeExperience("sf1", "x1");
    await staff.updateSalary("sf1", { basic: 1, allowances: 2, deductions: 3, effectiveFrom: "2026-04-01" } as never);
    await staff.recordSalaryPayment("sf1", "2026-09");
    await staff.addPerformanceReview("sf1", { reviewerName: "P", rating: 5, comments: "Great" } as never);
    await staff.uploadStaffDocument("sf1", { name: "Contract", category: "contract" });
    await staff.deleteStaffDocument("sf1", "d1");
    await staff.uploadStaffPhoto("sf1", "data:image/png;base64,AA");

    expect(calls[2].body).toEqual({ organization: "ABC", role: "Teacher", fromYear: 2010, toYear: null, description: null });
    expect(calls[4].body).toEqual({ basic: 1, allowances: 2, deductions: 3, bankName: null, bankAccountNumber: null, effectiveFrom: "2026-04-01" });
    expect(calls[5].body).toEqual({ month: "2026-09" });
    expect(calls[7].body).toEqual({ name: "Contract", category: "Contract", fileDataUrl: null });
  });

  it("summarises the last 90 days of attendance with the most recent 14 days", async () => {
    const summary = await staff.getStaffAttendance("sf1");

    expect(summary.totalDays).toBe(16);
    expect(summary.presentDays + summary.absentDays + summary.lateDays).toBe(16);
    expect(summary.absentDays).toBe(4);
    expect(summary.recent).toHaveLength(14);
    expect(summary.recent.at(-1)?.date).toBe("2026-09-25");
  });

  it("leave requests", async () => {
    const dto = { id: "l1", tenantId: "t", branchId: "b", staffId: "sf1", leaveType: "Earned", fromDate: "a", toDate: "b", reason: "Trip", status: "Approved", requestedAt: "" };
    const calls = stubClient(academicHttpClient, {
      "GET /api/leaverequests": [dto, { ...dto, id: "l2", leaveType: "?", status: "?" }],
      "POST /api/leaverequests": dto,
      "PUT /api/leaverequests/l1/status": dto,
    });

    const [approved, odd] = await staff.listLeaveRequests();
    await staff.createLeaveRequest({ staffId: "sf1", leaveType: "sick", fromDate: "a", toDate: "b", reason: "Flu" } as never);
    await staff.setLeaveStatus("l1", "rejected");

    expect(approved).toMatchObject({ leaveType: "earned", status: "approved" });
    expect(odd).toMatchObject({ leaveType: "casual", status: "pending" });
    expect(calls[1].body).toMatchObject({ leaveType: "Sick" });
    expect(calls[2].body).toEqual({ status: "Rejected" });
  });
});
