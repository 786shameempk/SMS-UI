import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaffAttendanceRecords } from "@/features/attendance/api";
import type {
  Experience,
  ExperienceFormValues,
  Gender,
  LeaveRequestFormValues,
  LeaveStatus,
  LeaveType,
  PerformanceReview,
  PerformanceReviewFormValues,
  PromoteStaffFormValues,
  Qualification,
  QualificationFormValues,
  ResignStaffFormValues,
  SalaryDetails,
  StaffAttendanceSummary,
  StaffDesignation,
  StaffDocument,
  StaffFormValues,
  StaffLeaveRequest,
  StaffMember,
  StaffStatus,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// AcademicService's enums serialize as PascalCase; SMS UI's types use lowercase/kebab-case unions.

const GENDER_TO_API: Record<Gender, string> = { male: "Male", female: "Female", other: "Other" };
const GENDER_FROM_API: Record<string, Gender> = { Male: "male", Female: "female", Other: "other" };

const DESIGNATION_TO_API: Record<StaffDesignation, string> = {
  Teacher: "Teacher",
  Principal: "Principal",
  "Vice Principal": "VicePrincipal",
  Accountant: "Accountant",
  Receptionist: "Receptionist",
  Librarian: "Librarian",
  Driver: "Driver",
  Warden: "Warden",
  Nurse: "Nurse",
  Cleaner: "Cleaner",
  Security: "Security",
  HR: "HR",
  "IT Support": "ITSupport",
};
const DESIGNATION_FROM_API: Record<string, StaffDesignation> = {
  Teacher: "Teacher",
  Principal: "Principal",
  VicePrincipal: "Vice Principal",
  Accountant: "Accountant",
  Receptionist: "Receptionist",
  Librarian: "Librarian",
  Driver: "Driver",
  Warden: "Warden",
  Nurse: "Nurse",
  Cleaner: "Cleaner",
  Security: "Security",
  HR: "HR",
  ITSupport: "IT Support",
};

const STAFF_STATUS_FROM_API: Record<string, StaffStatus> = {
  Active: "active",
  OnLeave: "on-leave",
  Resigned: "resigned",
  Terminated: "terminated",
};

const DOCUMENT_CATEGORY_TO_API: Record<StaffDocument["category"], string> = {
  id_proof: "IdProof",
  resume: "Resume",
  certificate: "Certificate",
  contract: "Contract",
  other: "Other",
};
const DOCUMENT_CATEGORY_FROM_API: Record<string, StaffDocument["category"]> = {
  IdProof: "id_proof",
  Resume: "resume",
  Certificate: "certificate",
  Contract: "contract",
  Other: "other",
};

const LEAVE_TYPE_TO_API: Record<LeaveType, string> = { sick: "Sick", casual: "Casual", earned: "Earned", unpaid: "Unpaid" };
const LEAVE_TYPE_FROM_API: Record<string, LeaveType> = { Sick: "sick", Casual: "casual", Earned: "earned", Unpaid: "unpaid" };

const LEAVE_STATUS_TO_API: Record<LeaveStatus, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const LEAVE_STATUS_FROM_API: Record<string, LeaveStatus> = { Pending: "pending", Approved: "approved", Rejected: "rejected" };

// ── API response shapes (AcademicService DTOs) ──────────────────────────────

interface ApiQualification {
  id: string;
  degree: string;
  institution: string;
  yearCompleted: number;
}

interface ApiExperience {
  id: string;
  organization: string;
  role: string;
  fromYear: number;
  toYear: number | null;
  description: string | null;
}

interface ApiSalaryDetails {
  basic: number;
  allowances: number;
  deductions: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  effectiveFrom: string;
}

interface ApiSalaryPayment {
  id: string;
  month: string;
  amountPaid: number;
  paidOn: string;
}

interface ApiStaffDocument {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  fileDataUrl: string | null;
}

interface ApiPerformanceReview {
  id: string;
  reviewDate: string;
  reviewerName: string;
  rating: number;
  comments: string;
}

interface ApiPromotionRecord {
  id: string;
  fromDesignation: string;
  toDesignation: string;
  effectiveDate: string;
  remarks: string | null;
}

interface ApiResignationRecord {
  resignedAt: string;
  lastWorkingDate: string;
  reason: string;
}

interface ApiStaffMember {
  id: string;
  tenantId: string;
  branchId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  designation: string;
  department: string;
  status: string;
  joiningDate: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  qualifications: ApiQualification[];
  experience: ApiExperience[];
  salary: ApiSalaryDetails;
  salaryHistory: ApiSalaryPayment[];
  documents: ApiStaffDocument[];
  performanceReviews: ApiPerformanceReview[];
  promotions: ApiPromotionRecord[];
  resignation: ApiResignationRecord | null;
}

interface ApiStaffLeaveRequest {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
  requestedAt: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapStaff(dto: ApiStaffMember): StaffMember {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    employeeId: dto.employeeId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    photoUrl: dto.photoUrl,
    designation: DESIGNATION_FROM_API[dto.designation] ?? "Teacher",
    department: dto.department,
    status: STAFF_STATUS_FROM_API[dto.status] ?? "active",
    joiningDate: dto.joiningDate,
    dateOfBirth: dto.dateOfBirth,
    gender: GENDER_FROM_API[dto.gender] ?? "other",
    phone: dto.phone,
    email: dto.email,
    address: dto.address,
    qualifications: dto.qualifications.map((q): Qualification => ({
      id: q.id,
      degree: q.degree,
      institution: q.institution,
      yearCompleted: q.yearCompleted,
    })),
    experience: dto.experience.map((e): Experience => ({
      id: e.id,
      organization: e.organization,
      role: e.role,
      fromYear: e.fromYear,
      toYear: e.toYear ?? undefined,
      description: e.description ?? undefined,
    })),
    salary: {
      basic: dto.salary.basic,
      allowances: dto.salary.allowances,
      deductions: dto.salary.deductions,
      bankName: dto.salary.bankName ?? undefined,
      bankAccountNumber: dto.salary.bankAccountNumber ?? undefined,
      effectiveFrom: dto.salary.effectiveFrom,
    },
    salaryHistory: dto.salaryHistory.map((p) => ({ id: p.id, month: p.month, amountPaid: p.amountPaid, paidOn: p.paidOn })),
    documents: dto.documents.map((d) => ({
      id: d.id,
      name: d.name,
      category: DOCUMENT_CATEGORY_FROM_API[d.category] ?? "other",
      uploadedAt: d.uploadedAt,
      fileDataUrl: d.fileDataUrl ?? undefined,
    })),
    performanceReviews: dto.performanceReviews.map((r): PerformanceReview => ({
      id: r.id,
      reviewDate: r.reviewDate,
      reviewerName: r.reviewerName,
      rating: r.rating,
      comments: r.comments,
    })),
    promotions: dto.promotions.map((p) => ({
      id: p.id,
      fromDesignation: p.fromDesignation,
      toDesignation: p.toDesignation,
      effectiveDate: p.effectiveDate,
      remarks: p.remarks ?? undefined,
    })),
    resignation: dto.resignation
      ? { resignedAt: dto.resignation.resignedAt, lastWorkingDate: dto.resignation.lastWorkingDate, reason: dto.resignation.reason }
      : undefined,
  };
}

function mapLeaveRequest(dto: ApiStaffLeaveRequest): StaffLeaveRequest {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    staffId: dto.staffId,
    leaveType: LEAVE_TYPE_FROM_API[dto.leaveType] ?? "casual",
    fromDate: dto.fromDate,
    toDate: dto.toDate,
    reason: dto.reason,
    status: LEAVE_STATUS_FROM_API[dto.status] ?? "pending",
    requestedAt: dto.requestedAt,
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Staff directory ──────────────────────────────────────────────────────

export async function listStaff(): Promise<StaffMember[]> {
  const staff = await unwrap(academicHttpClient.get<ApiStaffMember[]>("/api/staff"));
  return staff.map(mapStaff);
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  const dto = await unwrap(academicHttpClient.get<ApiStaffMember>(`/api/staff/${id}`));
  return mapStaff(dto);
}

export async function createStaff(values: StaffFormValues): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffMember>("/api/staff", {
      branchId: values.branchId,
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      gender: GENDER_TO_API[values.gender],
      designation: DESIGNATION_TO_API[values.designation],
      department: values.department,
      phone: values.phone,
      email: values.email,
      address: values.address,
    }),
  );
  return mapStaff(dto);
}

export async function updateStaff(id: string, values: StaffFormValues): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.put<ApiStaffMember>(`/api/staff/${id}`, {
      branchId: values.branchId,
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      gender: GENDER_TO_API[values.gender],
      designation: DESIGNATION_TO_API[values.designation],
      department: values.department,
      phone: values.phone,
      email: values.email,
      address: values.address,
    }),
  );
  return mapStaff(dto);
}

export async function promoteStaff(id: string, values: PromoteStaffFormValues): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/promote`, {
      toDesignation: DESIGNATION_TO_API[values.toDesignation],
      effectiveDate: values.effectiveDate,
      remarks: values.remarks ?? null,
    }),
  );
  return mapStaff(dto);
}

export async function resignStaff(id: string, values: ResignStaffFormValues): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/resign`, {
      lastWorkingDate: values.lastWorkingDate,
      reason: values.reason,
    }),
  );
  return mapStaff(dto);
}

export async function reactivateStaff(id: string): Promise<StaffMember> {
  const dto = await unwrap(academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/reactivate`));
  return mapStaff(dto);
}

// ── Qualifications & experience ─────────────────────────────────────────

export async function addQualification(id: string, values: QualificationFormValues): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/qualifications`, {
      degree: values.degree,
      institution: values.institution,
      yearCompleted: values.yearCompleted,
    }),
  );
  return mapStaff(dto);
}

export async function removeQualification(id: string, qualificationId: string): Promise<StaffMember> {
  const dto = await unwrap(academicHttpClient.delete<ApiStaffMember>(`/api/staff/${id}/qualifications/${qualificationId}`));
  return mapStaff(dto);
}

export async function addExperience(id: string, values: ExperienceFormValues): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/experience`, {
      organization: values.organization,
      role: values.role,
      fromYear: values.fromYear,
      toYear: values.toYear ?? null,
      description: values.description ?? null,
    }),
  );
  return mapStaff(dto);
}

export async function removeExperience(id: string, experienceId: string): Promise<StaffMember> {
  const dto = await unwrap(academicHttpClient.delete<ApiStaffMember>(`/api/staff/${id}/experience/${experienceId}`));
  return mapStaff(dto);
}

// ── Salary ───────────────────────────────────────────────────────────────

export async function updateSalary(id: string, salary: SalaryDetails): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.put<ApiStaffMember>(`/api/staff/${id}/salary`, {
      basic: salary.basic,
      allowances: salary.allowances,
      deductions: salary.deductions,
      bankName: salary.bankName ?? null,
      bankAccountNumber: salary.bankAccountNumber ?? null,
      effectiveFrom: salary.effectiveFrom,
    }),
  );
  return mapStaff(dto);
}

export async function recordSalaryPayment(id: string, month: string): Promise<StaffMember> {
  const dto = await unwrap(academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/salary/payments`, { month }));
  return mapStaff(dto);
}

// ── Attendance ───────────────────────────────────────────────────────────
// Summarized from the real staff attendance register (AcademicService /api/attendance/staff/records).

const STAFF_ATTENDANCE_WINDOW_DAYS = 90;
const STAFF_ATTENDANCE_RECENT_DAYS = 14;

export async function getStaffAttendance(id: string): Promise<StaffAttendanceSummary> {
  const from = new Date();
  from.setDate(from.getDate() - STAFF_ATTENDANCE_WINDOW_DAYS);
  const records = (await listStaffAttendanceRecords({ dateFrom: from.toISOString().slice(0, 10) }))
    .filter((r) => r.staffId === id)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    presentDays: records.filter((r) => r.status === "present").length,
    absentDays: records.filter((r) => r.status === "absent").length,
    lateDays: records.filter((r) => r.status === "late").length,
    totalDays: records.length,
    recent: records.slice(-STAFF_ATTENDANCE_RECENT_DAYS).map((r) => ({ date: r.date, status: r.status })),
  };
}

// ── Performance reviews ──────────────────────────────────────────────────

export async function addPerformanceReview(id: string, values: PerformanceReviewFormValues): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/performance-reviews`, {
      reviewerName: values.reviewerName,
      rating: values.rating,
      comments: values.comments,
    }),
  );
  return mapStaff(dto);
}

// ── Documents ────────────────────────────────────────────────────────────

export async function uploadStaffDocument(
  id: string,
  doc: { name: string; category: StaffDocument["category"]; fileDataUrl?: string },
): Promise<StaffMember> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffMember>(`/api/staff/${id}/documents`, {
      name: doc.name,
      category: DOCUMENT_CATEGORY_TO_API[doc.category],
      fileDataUrl: doc.fileDataUrl ?? null,
    }),
  );
  return mapStaff(dto);
}

export async function deleteStaffDocument(id: string, documentId: string): Promise<StaffMember> {
  const dto = await unwrap(academicHttpClient.delete<ApiStaffMember>(`/api/staff/${id}/documents/${documentId}`));
  return mapStaff(dto);
}

export async function uploadStaffPhoto(id: string, photoUrl: string | null): Promise<StaffMember> {
  const dto = await unwrap(academicHttpClient.put<ApiStaffMember>(`/api/staff/${id}/photo`, { photoUrl }));
  return mapStaff(dto);
}

// ── Leave requests ───────────────────────────────────────────────────────

export async function listLeaveRequests(): Promise<StaffLeaveRequest[]> {
  const requests = await unwrap(academicHttpClient.get<ApiStaffLeaveRequest[]>("/api/leaverequests"));
  return requests.map(mapLeaveRequest);
}

export async function createLeaveRequest(values: LeaveRequestFormValues): Promise<StaffLeaveRequest> {
  const dto = await unwrap(
    academicHttpClient.post<ApiStaffLeaveRequest>("/api/leaverequests", {
      staffId: values.staffId,
      leaveType: LEAVE_TYPE_TO_API[values.leaveType],
      fromDate: values.fromDate,
      toDate: values.toDate,
      reason: values.reason,
    }),
  );
  return mapLeaveRequest(dto);
}

export async function setLeaveStatus(id: string, status: LeaveStatus): Promise<StaffLeaveRequest> {
  const dto = await unwrap(
    academicHttpClient.put<ApiStaffLeaveRequest>(`/api/leaverequests/${id}/status`, { status: LEAVE_STATUS_TO_API[status] }),
  );
  return mapLeaveRequest(dto);
}
