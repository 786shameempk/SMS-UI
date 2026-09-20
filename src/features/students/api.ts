import { mockDelay } from "@/utils/mockDelay";
import {
  DEFAULT_TENANT_ID,
  defaultBranchIdForTenant,
  getCurrentBranchId,
  getCurrentTenantId,
  migrateLegacyRecordsToDefaultBranch,
  migrateLegacyRecordsToDefaultTenant,
  scopedToCurrentTenant,
  scopedToCurrentTenantAndBranch,
} from "@/utils/tenant";
import { listClasses, listSections } from "@/features/academics/api";
import { SEED_ADMISSIONS, SEED_STUDENTS } from "./mock";
import { ADMISSION_FEE_AMOUNT, ADMISSION_STAGE_CONFIG, CLASS_OPTIONS, FINAL_CLASS } from "./constants";
import type {
  AdmissionApplication,
  AdmissionDecisionFormValues,
  AdmissionExamFormValues,
  AdmissionFeePaymentFormValues,
  AdmissionFormValues,
  AdmissionInterviewFormValues,
  AdmissionRegistrationFormValues,
  AdmissionStage,
  EmergencyContact,
  GuardianDetails,
  HostelDetails,
  MedicalInfo,
  SeatAvailability,
  Student,
  StudentDocument,
  StudentFormValues,
  TransferFormValues,
  TransportDetails,
} from "./types";

const STUDENTS_KEY = "sms-mock-students";
const ADMISSIONS_KEY = "sms-mock-admissions";

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

let students = migrateLegacyRecordsToDefaultBranch(
  migrateLegacyRecordsToDefaultTenant(
    loadJson<Student[]>(STUDENTS_KEY, SEED_STUDENTS.map((s) => ({ ...s, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID) }))),
  ),
);

/**
 * Guards against admissions data cached in localStorage from before the flat
 * status/approved-reject model was rewritten into the 9-stage pipeline (see
 * PROGRESS.md task 15) — a stale record with no recognized `stage` would otherwise
 * crash the Admissions table. Unrecognized stages fall back to "inquiry".
 */
function normalizeAdmissionStage(stage: AdmissionStage): AdmissionStage {
  return stage in ADMISSION_STAGE_CONFIG ? stage : "inquiry";
}

let admissions = migrateLegacyRecordsToDefaultBranch(
  migrateLegacyRecordsToDefaultTenant(
    loadJson<AdmissionApplication[]>(
      ADMISSIONS_KEY,
      SEED_ADMISSIONS.map((a) => ({ ...a, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID) })),
    ),
  ),
).map((a) => ({
  ...a,
  stage: normalizeAdmissionStage(a.stage),
}));

function persistStudents() {
  saveJson(STUDENTS_KEY, students);
}
function persistAdmissions() {
  saveJson(ADMISSIONS_KEY, admissions);
}

function nextAdmissionNumber(): string {
  const year = new Date().getFullYear();
  const max = scopedToCurrentTenant(students).reduce((acc, s) => {
    const match = s.admissionNumber.match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `EDU-${year}-${String(max + 1).padStart(4, "0")}`;
}

function requireStudent(id: string): Student {
  const student = students.find((s) => s.id === id && s.tenantId === getCurrentTenantId() && s.branchId === getCurrentBranchId());
  if (!student) throw new Error("Student not found");
  return student;
}

function requireAdmission(id: string): AdmissionApplication {
  const application = admissions.find((a) => a.id === id && a.tenantId === getCurrentTenantId() && a.branchId === getCurrentBranchId());
  if (!application) throw new Error("Application not found");
  return application;
}

function nextApplicationNumber(): string {
  const year = new Date().getFullYear();
  const max = scopedToCurrentTenant(admissions).reduce((acc, a) => {
    const match = a.applicationNumber.match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `ADM-${year}-${String(max + 1).padStart(4, "0")}`;
}

function buildStudentFromValues(values: StudentFormValues): Student {
  return {
    id: `stu-${Math.random().toString(36).slice(2, 9)}`,
    tenantId: getCurrentTenantId(),
    branchId: values.branchId,
    admissionNumber: nextAdmissionNumber(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    photoUrl: null,
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    className: values.className,
    section: values.section,
    rollNumber: values.rollNumber?.trim(),
    status: "active",
    admissionDate: new Date().toISOString(),
    address: values.address.trim(),
    guardians: [
      {
        id: `g-${Math.random().toString(36).slice(2, 8)}`,
        name: values.guardianName.trim(),
        relation: values.guardianRelation,
        phone: values.guardianPhone.trim(),
      },
    ],
    emergencyContact: { name: values.guardianName.trim(), relation: values.guardianRelation, phone: values.guardianPhone.trim() },
    medical: { bloodGroup: "unknown" },
    transport: { required: false },
    hostel: { required: false },
    documents: [],
  };
}

// ── Students ─────────────────────────────────────────────────────────────

export async function listStudents(): Promise<Student[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(students), 400);
}

export async function getStudent(id: string): Promise<Student> {
  return mockDelay(requireStudent(id), 300);
}

export async function createStudent(values: StudentFormValues): Promise<Student> {
  const student = buildStudentFromValues(values);
  students = [student, ...students];
  persistStudents();
  return mockDelay(student, 450);
}

export async function updateStudent(id: string, values: StudentFormValues): Promise<Student> {
  const existing = requireStudent(id);
  const updated: Student = {
    ...existing,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    className: values.className,
    section: values.section,
    rollNumber: values.rollNumber?.trim(),
    address: values.address.trim(),
  };
  students = students.map((s) => (s.id === id ? updated : s));
  persistStudents();
  return mockDelay(updated, 400);
}

async function patchStudent(id: string, patch: Partial<Student>): Promise<Student> {
  const existing = requireStudent(id);
  const updated = { ...existing, ...patch };
  students = students.map((s) => (s.id === id ? updated : s));
  persistStudents();
  return mockDelay(updated, 350);
}

export async function updateGuardians(id: string, guardians: GuardianDetails[]): Promise<Student> {
  return patchStudent(id, { guardians });
}

export async function updateEmergencyContact(id: string, emergencyContact: EmergencyContact): Promise<Student> {
  return patchStudent(id, { emergencyContact });
}

export async function updateMedical(id: string, medical: MedicalInfo): Promise<Student> {
  return patchStudent(id, { medical });
}

export async function updateTransport(id: string, transport: TransportDetails): Promise<Student> {
  return patchStudent(id, { transport });
}

export async function updateHostel(id: string, hostel: HostelDetails): Promise<Student> {
  return patchStudent(id, { hostel });
}

export async function uploadStudentPhoto(id: string, photoUrl: string | null): Promise<Student> {
  return patchStudent(id, { photoUrl });
}

export async function uploadStudentDocument(
  id: string,
  doc: { name: string; category: StudentDocument["category"]; fileDataUrl?: string },
): Promise<Student> {
  const existing = requireStudent(id);
  const document: StudentDocument = {
    id: `doc-${Math.random().toString(36).slice(2, 8)}`,
    name: doc.name,
    category: doc.category,
    uploadedAt: new Date().toISOString(),
    fileDataUrl: doc.fileDataUrl,
  };
  return patchStudent(id, { documents: [document, ...existing.documents] });
}

export async function deleteStudentDocument(id: string, documentId: string): Promise<Student> {
  const existing = requireStudent(id);
  return patchStudent(id, { documents: existing.documents.filter((d) => d.id !== documentId) });
}

export async function transferStudent(id: string, values: TransferFormValues): Promise<Student> {
  return patchStudent(id, {
    status: "transferred",
    transferRecord: { ...values, transferredAt: new Date().toISOString() },
  });
}

export interface PromotionResult {
  promotedCount: number;
}

export async function promoteStudents(params: {
  fromClass: string;
  fromSection: string;
  toClass: string;
  toSection: string;
}): Promise<PromotionResult> {
  let count = 0;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  students = students.map((s) => {
    if (s.tenantId === tenantId && s.branchId === branchId && s.status === "active" && s.className === params.fromClass && s.section === params.fromSection) {
      count++;
      return { ...s, className: params.toClass, section: params.toSection };
    }
    return s;
  });
  persistStudents();
  return mockDelay({ promotedCount: count }, 500);
}

export interface GraduationResult {
  graduatedCount: number;
}

export async function graduateStudents(className: string = FINAL_CLASS): Promise<GraduationResult> {
  let count = 0;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  students = students.map((s) => {
    if (s.tenantId === tenantId && s.branchId === branchId && s.status === "active" && s.className === className) {
      count++;
      return { ...s, status: "graduated" as const };
    }
    return s;
  });
  persistStudents();
  return mockDelay({ graduatedCount: count }, 500);
}

// ── Admissions: Inquiry → Registration → Entrance Exam → Interview → ─────
// ── Selection → Fee Collection → Student Creation, plus seat availability ─

export async function listAdmissions(): Promise<AdmissionApplication[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(admissions), 400);
}

/** Step 1 — Inquiry: a lightweight first submission, before any review has happened. */
export async function createAdmission(values: AdmissionFormValues): Promise<AdmissionApplication> {
  const application: AdmissionApplication = {
    id: `adm-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: getCurrentTenantId(),
    applicationNumber: nextApplicationNumber(),
    ...values,
    stage: "inquiry",
    submittedAt: new Date().toISOString(),
  };
  admissions = [application, ...admissions];
  persistAdmissions();
  return mockDelay(application, 450);
}

/** Step 2 — Registration: the inquiry is formalized with full contact/history details. */
export async function registerAdmission(id: string, values: AdmissionRegistrationFormValues): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  const updated: AdmissionApplication = { ...existing, ...values, stage: "registration", registeredAt: new Date().toISOString() };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 400);
}

/** Step 3 — Entrance Exam: schedule a date, then (re-open the same action) record the result. */
export async function updateAdmissionExam(id: string, values: AdmissionExamFormValues): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  const updated: AdmissionApplication = { ...existing, ...values, stage: "entrance_exam" };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 400);
}

/** Step 4 — Interview: schedule/record an interview against the exam-cleared applicant. */
export async function updateAdmissionInterview(id: string, values: AdmissionInterviewFormValues): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  const updated: AdmissionApplication = { ...existing, ...values, stage: "interview" };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 400);
}

/**
 * Step 5 — Selection: the decision routes the application straight to its next stage —
 * "selected" moves to Fee Collection (with the standard admission fee applied), "waitlisted"
 * and "rejected" are terminal until/unless promoted from the waitlist.
 */
export async function decideAdmission(id: string, values: AdmissionDecisionFormValues): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  const updated: AdmissionApplication = {
    ...existing,
    ...values,
    decidedAt: new Date().toISOString(),
    stage: values.decision === "selected" ? "fee_collection" : values.decision,
    admissionFeeAmount: values.decision === "selected" ? ADMISSION_FEE_AMOUNT : existing.admissionFeeAmount,
  };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 400);
}

/** A waitlisted applicant can be pulled back in once a seat frees up, re-entering at Fee Collection. */
export async function promoteFromWaitlist(id: string): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  if (existing.stage !== "waitlisted") {
    await mockDelay(null, 300);
    throw new Error("Only waitlisted applications can be promoted");
  }
  const updated: AdmissionApplication = {
    ...existing,
    stage: "fee_collection",
    decision: "selected",
    admissionFeeAmount: existing.admissionFeeAmount ?? ADMISSION_FEE_AMOUNT,
  };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 400);
}

/** Step 6 — Fee Collection: records payment. Enrollment (student creation) is a separate, explicit step. */
export async function recordAdmissionFeePayment(id: string, values: AdmissionFeePaymentFormValues): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  if (existing.stage !== "fee_collection") {
    await mockDelay(null, 300);
    throw new Error("This application isn't at the fee collection stage");
  }
  const receiptNumber = `RCT-ADM-${String(scopedToCurrentTenant(admissions).filter((a) => a.admissionFeeReceiptNumber).length + 1).padStart(4, "0")}`;
  const updated: AdmissionApplication = {
    ...existing,
    admissionFeeAmount: values.amount,
    admissionFeePaid: true,
    admissionFeePaidOn: new Date().toISOString(),
    admissionFeeReceiptNumber: receiptNumber,
  };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 450);
}

export async function rejectAdmission(id: string, remarks?: string): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  const updated: AdmissionApplication = { ...existing, stage: "rejected", decision: "rejected", decisionRemarks: remarks ?? existing.decisionRemarks, decidedAt: new Date().toISOString() };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 350);
}

export async function withdrawAdmission(id: string): Promise<AdmissionApplication> {
  const existing = requireAdmission(id);
  const updated: AdmissionApplication = { ...existing, stage: "withdrawn" };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 350);
}

/** Step 7 — Student Creation: only reachable once the admission fee has actually been paid. */
export async function enrollAdmission(id: string): Promise<{ application: AdmissionApplication; student: Student }> {
  const application = requireAdmission(id);
  if (application.stage !== "fee_collection" || !application.admissionFeePaid) {
    await mockDelay(null, 300);
    throw new Error("The admission fee must be paid before enrolling this applicant");
  }
  const student = buildStudentFromValues({
    branchId: application.branchId,
    firstName: application.applicantFirstName,
    lastName: application.applicantLastName,
    dateOfBirth: application.dateOfBirth,
    gender: application.gender,
    className: application.appliedClass,
    section: "A",
    address: application.address ?? "",
    guardianName: application.guardianName,
    guardianRelation: "guardian",
    guardianPhone: application.guardianPhone,
  });
  students = [student, ...students];
  persistStudents();

  const updatedApplication: AdmissionApplication = { ...application, stage: "enrolled", studentId: student.id, enrolledAt: new Date().toISOString() };
  admissions = admissions.map((a) => (a.id === id ? updatedApplication : a));
  persistAdmissions();

  return mockDelay({ application: updatedApplication, student }, 500);
}

// ── Seat availability ────────────────────────────────────────────────────

/**
 * Joins by class name against the Academic Management module's real `Section` capacity/
 * currentStrength (the same string-matching workaround Attendance/Teachers/Examinations/
 * Homework already use, since `Student.className` isn't id-linked to academics' `Class` yet).
 */
export async function listSeatAvailability(): Promise<SeatAvailability[]> {
  const [classes, sections] = await Promise.all([listClasses(), listSections()]);
  const classByName = new Map(classes.map((c) => [c.name, c] as const));

  const result: SeatAvailability[] = CLASS_OPTIONS.map((className) => {
    const schoolClass = classByName.get(className);
    const classSections = schoolClass ? sections.filter((s) => s.classId === schoolClass.id) : [];
    const capacity = classSections.reduce((sum, s) => sum + s.capacity, 0);
    const currentStrength = classSections.reduce((sum, s) => sum + s.currentStrength, 0);
    return { className, capacity, currentStrength, availableSeats: Math.max(0, capacity - currentStrength) };
  });
  return mockDelay(result, 350);
}

export async function getSeatAvailability(className: string): Promise<SeatAvailability | null> {
  const all = await listSeatAvailability();
  return all.find((s) => s.className === className) ?? null;
}
