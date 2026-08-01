import { mockDelay } from "@/utils/mockDelay";
import { SEED_LEAVE_REQUESTS, SEED_STAFF, buildStaffAttendance } from "./mock";
import type {
  Experience,
  ExperienceFormValues,
  LeaveRequestFormValues,
  LeaveStatus,
  PerformanceReview,
  PerformanceReviewFormValues,
  PromoteStaffFormValues,
  Qualification,
  QualificationFormValues,
  ResignStaffFormValues,
  SalaryDetails,
  StaffAttendanceSummary,
  StaffDocument,
  StaffFormValues,
  StaffLeaveRequest,
  StaffMember,
} from "./types";

const STAFF_KEY = "sms-mock-staff";
const LEAVE_KEY = "sms-mock-staff-leave";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

let staff = loadJson<StaffMember[]>(STAFF_KEY, SEED_STAFF.map((s) => ({ ...s })));
let leaveRequests = loadJson<StaffLeaveRequest[]>(LEAVE_KEY, SEED_LEAVE_REQUESTS.map((l) => ({ ...l })));

function persistStaff() {
  saveJson(STAFF_KEY, staff);
}
function persistLeave() {
  saveJson(LEAVE_KEY, leaveRequests);
}

function nextEmployeeId(): string {
  const max = staff.reduce((acc, s) => Math.max(acc, Number(s.employeeId.replace("EMP-", "")) || 0), 1000);
  return `EMP-${max + 1}`;
}

function requireStaff(id: string): StaffMember {
  const member = staff.find((s) => s.id === id);
  if (!member) throw new Error("Staff member not found");
  return member;
}

async function patchStaff(id: string, patch: Partial<StaffMember>): Promise<StaffMember> {
  const existing = requireStaff(id);
  const updated = { ...existing, ...patch };
  staff = staff.map((s) => (s.id === id ? updated : s));
  persistStaff();
  return mockDelay(updated, 350);
}

// ── Staff directory ──────────────────────────────────────────────────────

export async function listStaff(): Promise<StaffMember[]> {
  return mockDelay([...staff], 400);
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  return mockDelay(requireStaff(id), 300);
}

export async function createStaff(values: StaffFormValues): Promise<StaffMember> {
  if (staff.some((s) => s.email.toLowerCase() === values.email.trim().toLowerCase())) {
    await mockDelay(null, 400);
    throw new Error("A staff member with this email already exists");
  }
  const member: StaffMember = {
    id: `stf-${Math.random().toString(36).slice(2, 9)}`,
    employeeId: nextEmployeeId(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    photoUrl: null,
    designation: values.designation,
    department: values.department.trim(),
    status: "active",
    joiningDate: new Date().toISOString(),
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    phone: values.phone.trim(),
    email: values.email.trim(),
    address: values.address.trim(),
    qualifications: [],
    experience: [],
    salary: { basic: 0, allowances: 0, deductions: 0, effectiveFrom: new Date().toISOString() },
    salaryHistory: [],
    documents: [],
    performanceReviews: [],
    promotions: [],
  };
  staff = [member, ...staff];
  persistStaff();
  return mockDelay(member, 450);
}

export async function updateStaff(id: string, values: StaffFormValues): Promise<StaffMember> {
  requireStaff(id);
  if (staff.some((s) => s.id !== id && s.email.toLowerCase() === values.email.trim().toLowerCase())) {
    await mockDelay(null, 400);
    throw new Error("A staff member with this email already exists");
  }
  return patchStaff(id, {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    designation: values.designation,
    department: values.department.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    address: values.address.trim(),
  });
}

export async function promoteStaff(id: string, values: PromoteStaffFormValues): Promise<StaffMember> {
  const existing = requireStaff(id);
  return patchStaff(id, {
    designation: values.toDesignation,
    promotions: [
      {
        id: `pm-${Math.random().toString(36).slice(2, 8)}`,
        fromDesignation: existing.designation,
        toDesignation: values.toDesignation,
        effectiveDate: values.effectiveDate,
        remarks: values.remarks,
      },
      ...existing.promotions,
    ],
  });
}

export async function resignStaff(id: string, values: ResignStaffFormValues): Promise<StaffMember> {
  return patchStaff(id, {
    status: "resigned",
    resignation: { resignedAt: new Date().toISOString(), lastWorkingDate: values.lastWorkingDate, reason: values.reason },
  });
}

export async function reactivateStaff(id: string): Promise<StaffMember> {
  return patchStaff(id, { status: "active", resignation: undefined });
}

// ── Qualifications & experience ─────────────────────────────────────────

export async function addQualification(id: string, values: QualificationFormValues): Promise<StaffMember> {
  const existing = requireStaff(id);
  const qualification: Qualification = { id: `q-${Math.random().toString(36).slice(2, 8)}`, ...values };
  return patchStaff(id, { qualifications: [qualification, ...existing.qualifications] });
}

export async function removeQualification(id: string, qualificationId: string): Promise<StaffMember> {
  const existing = requireStaff(id);
  return patchStaff(id, { qualifications: existing.qualifications.filter((q) => q.id !== qualificationId) });
}

export async function addExperience(id: string, values: ExperienceFormValues): Promise<StaffMember> {
  const existing = requireStaff(id);
  const experience: Experience = { id: `e-${Math.random().toString(36).slice(2, 8)}`, ...values };
  return patchStaff(id, { experience: [experience, ...existing.experience] });
}

export async function removeExperience(id: string, experienceId: string): Promise<StaffMember> {
  const existing = requireStaff(id);
  return patchStaff(id, { experience: existing.experience.filter((e) => e.id !== experienceId) });
}

// ── Salary ───────────────────────────────────────────────────────────────

export async function updateSalary(id: string, salary: SalaryDetails): Promise<StaffMember> {
  return patchStaff(id, { salary });
}

export async function recordSalaryPayment(id: string, month: string): Promise<StaffMember> {
  const existing = requireStaff(id);
  const net = existing.salary.basic + existing.salary.allowances - existing.salary.deductions;
  return patchStaff(id, {
    salaryHistory: [{ id: `sp-${Math.random().toString(36).slice(2, 8)}`, month, amountPaid: net, paidOn: new Date().toISOString() }, ...existing.salaryHistory],
  });
}

// ── Attendance ───────────────────────────────────────────────────────────

export async function getStaffAttendance(id: string): Promise<StaffAttendanceSummary> {
  return mockDelay(buildStaffAttendance(id), 350);
}

// ── Performance reviews ──────────────────────────────────────────────────

export async function addPerformanceReview(id: string, values: PerformanceReviewFormValues): Promise<StaffMember> {
  const existing = requireStaff(id);
  const review: PerformanceReview = { id: `pr-${Math.random().toString(36).slice(2, 8)}`, reviewDate: new Date().toISOString(), ...values };
  return patchStaff(id, { performanceReviews: [review, ...existing.performanceReviews] });
}

// ── Documents ────────────────────────────────────────────────────────────

export async function uploadStaffDocument(
  id: string,
  doc: { name: string; category: StaffDocument["category"]; fileDataUrl?: string },
): Promise<StaffMember> {
  const existing = requireStaff(id);
  const document: StaffDocument = {
    id: `doc-${Math.random().toString(36).slice(2, 8)}`,
    name: doc.name,
    category: doc.category,
    uploadedAt: new Date().toISOString(),
    fileDataUrl: doc.fileDataUrl,
  };
  return patchStaff(id, { documents: [document, ...existing.documents] });
}

export async function deleteStaffDocument(id: string, documentId: string): Promise<StaffMember> {
  const existing = requireStaff(id);
  return patchStaff(id, { documents: existing.documents.filter((d) => d.id !== documentId) });
}

export async function uploadStaffPhoto(id: string, photoUrl: string | null): Promise<StaffMember> {
  return patchStaff(id, { photoUrl });
}

// ── Leave requests ───────────────────────────────────────────────────────

export async function listLeaveRequests(): Promise<StaffLeaveRequest[]> {
  return mockDelay([...leaveRequests], 400);
}

export async function createLeaveRequest(values: LeaveRequestFormValues): Promise<StaffLeaveRequest> {
  const request: StaffLeaveRequest = {
    id: `sl-${Math.random().toString(36).slice(2, 8)}`,
    ...values,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  leaveRequests = [request, ...leaveRequests];
  persistLeave();
  return mockDelay(request, 450);
}

export async function setLeaveStatus(id: string, status: LeaveStatus): Promise<StaffLeaveRequest> {
  const idx = leaveRequests.findIndex((l) => l.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Leave request not found");
  }
  const updated = { ...leaveRequests[idx], status };
  leaveRequests = leaveRequests.map((l) => (l.id === id ? updated : l));
  persistLeave();
  return mockDelay(updated, 350);
}
