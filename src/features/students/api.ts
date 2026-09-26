import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { getCurrentBranchId } from "@/utils/tenant";
import { listClasses, listSections } from "@/features/academics/api";
import type {
  AdmissionApplication,
  AdmissionDecisionFormValues,
  AdmissionExamFormValues,
  AdmissionFeePaymentFormValues,
  AdmissionFormValues,
  AdmissionInterviewFormValues,
  AdmissionRegistrationFormValues,
  AdmissionStage,
  BloodGroup,
  DocumentCategory,
  EmergencyContact,
  ExamResultStatus,
  Gender,
  GuardianDetails,
  GuardianRelation,
  HostelDetails,
  MedicalInfo,
  SeatAvailability,
  SelectionDecision,
  Student,
  StudentDocument,
  StudentFormValues,
  StudentStatus,
  TransferFormValues,
  TransportDetails,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// AcademicService's enums serialize as PascalCase; SMS UI's types use lowercase/snake_case unions.

const GENDER_TO_API: Record<Gender, string> = { male: "Male", female: "Female", other: "Other" };
const GENDER_FROM_API: Record<string, Gender> = { Male: "male", Female: "female", Other: "other" };

const STUDENT_STATUS_FROM_API: Record<string, StudentStatus> = {
  Active: "active",
  Inactive: "inactive",
  Transferred: "transferred",
  Graduated: "graduated",
  Alumni: "alumni",
};

const GUARDIAN_RELATION_TO_API: Record<GuardianRelation, string> = {
  father: "Father",
  mother: "Mother",
  guardian: "Guardian",
};
const GUARDIAN_RELATION_FROM_API: Record<string, GuardianRelation> = {
  Father: "father",
  Mother: "mother",
  Guardian: "guardian",
};

const DOCUMENT_CATEGORY_TO_API: Record<DocumentCategory, string> = {
  birth_certificate: "BirthCertificate",
  transfer_certificate: "TransferCertificate",
  id_proof: "IdProof",
  photo: "Photo",
  medical_record: "MedicalRecord",
  other: "Other",
};
const DOCUMENT_CATEGORY_FROM_API: Record<string, DocumentCategory> = {
  BirthCertificate: "birth_certificate",
  TransferCertificate: "transfer_certificate",
  IdProof: "id_proof",
  Photo: "photo",
  MedicalRecord: "medical_record",
  Other: "other",
};

const ADMISSION_STAGE_FROM_API: Record<string, AdmissionStage> = {
  Inquiry: "inquiry",
  Registration: "registration",
  EntranceExam: "entrance_exam",
  Interview: "interview",
  FeeCollection: "fee_collection",
  Enrolled: "enrolled",
  Waitlisted: "waitlisted",
  Rejected: "rejected",
  Withdrawn: "withdrawn",
};

const EXAM_STATUS_TO_API: Record<ExamResultStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  absent: "Absent",
};
const EXAM_STATUS_FROM_API: Record<string, ExamResultStatus> = {
  Scheduled: "scheduled",
  Completed: "completed",
  Absent: "absent",
};

const SELECTION_DECISION_TO_API: Record<SelectionDecision, string> = {
  selected: "Selected",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};
const SELECTION_DECISION_FROM_API: Record<string, SelectionDecision> = {
  Selected: "selected",
  Waitlisted: "waitlisted",
  Rejected: "rejected",
};

/** A guardian row added in the UI but not yet saved gets a client-side placeholder id
 *  (`g-xxxxxxx`, see GuardianEmergencyTab.tsx) - never a real backend Guid. */
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealGuardianId = (id: string) => GUID_PATTERN.test(id);

// ── API response shapes (AcademicService DTOs) ──────────────────────────────

interface ApiGuardian {
  id: string;
  name: string;
  relation: string;
  phone: string;
  email: string | null;
  occupation: string | null;
}

interface ApiStudentDocument {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  fileDataUrl: string | null;
}

interface ApiTransferRecord {
  transferredAt: string;
  toSchool: string;
  reason: string;
  transferCertificateNumber: string;
}

interface ApiStudent {
  id: string;
  tenantId: string;
  branchId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  dateOfBirth: string;
  gender: string;
  sectionId: string;
  rollNumber: string | null;
  status: string;
  admissionDate: string;
  address: string;
  emergencyContact: { name: string; relation: string; phone: string };
  medical: {
    bloodGroup: string;
    allergies: string | null;
    conditions: string | null;
    medications: string | null;
    doctorName: string | null;
    doctorPhone: string | null;
  };
  transport: { required: boolean; routeName: string | null; pickupPoint: string | null };
  hostel: { required: boolean; hostelName: string | null; roomNumber: string | null };
  guardians: ApiGuardian[];
  documents: ApiStudentDocument[];
  transferRecord: ApiTransferRecord | null;
}

/** Student.sectionId doesn't carry a display name - resolved against AcademicService's own real
 *  Class/Section lists (already migrated - see academics/api.ts), the same string-matching bridge
 *  Attendance/Teachers/Examinations/Homework already use for this exact gap (see
 *  AuthService/docs/MICROSERVICES_PLAN.md's cleanup notes). */
async function buildSectionIndex() {
  const [classes, sections] = await Promise.all([listClasses(), listSections()]);
  const classById = new Map(classes.map((c) => [c.id, c] as const));
  const sectionById = new Map(sections.map((s) => [s.id, s] as const));
  return { classById, sectionById };
}

/** Class names aren't unique across branches, so a known branch narrows the match to it. */
async function resolveSectionId(className: string, sectionName: string, branchId?: string): Promise<string> {
  const [classes, sections] = await Promise.all([listClasses(), listSections()]);
  const classIds = new Set(
    classes.filter((c) => c.name === className && (!branchId || c.branchId === branchId)).map((c) => c.id),
  );
  if (classIds.size === 0) {
    throw new Error(`No class named "${className}" was found${branchId ? " in the selected branch" : ""}`);
  }
  const section = sections.find((s) => classIds.has(s.classId) && s.name === sectionName);
  if (!section) {
    throw new Error(`No section "${sectionName}" was found in class "${className}"`);
  }
  return section.id;
}

function mapStudent(dto: ApiStudent, index: Awaited<ReturnType<typeof buildSectionIndex>>): Student {
  const section = index.sectionById.get(dto.sectionId);
  const schoolClass = section ? index.classById.get(section.classId) : undefined;

  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    admissionNumber: dto.admissionNumber,
    firstName: dto.firstName,
    lastName: dto.lastName,
    photoUrl: dto.photoUrl,
    dateOfBirth: dto.dateOfBirth,
    gender: GENDER_FROM_API[dto.gender] ?? "other",
    className: schoolClass?.name ?? "",
    section: section?.name ?? "",
    rollNumber: dto.rollNumber ?? undefined,
    status: STUDENT_STATUS_FROM_API[dto.status] ?? "active",
    admissionDate: dto.admissionDate,
    address: dto.address,
    guardians: dto.guardians.map((g) => ({
      id: g.id,
      name: g.name,
      relation: GUARDIAN_RELATION_FROM_API[g.relation] ?? "guardian",
      phone: g.phone,
      email: g.email ?? undefined,
      occupation: g.occupation ?? undefined,
    })),
    emergencyContact: {
      name: dto.emergencyContact.name,
      relation: dto.emergencyContact.relation,
      phone: dto.emergencyContact.phone,
    },
    medical: {
      bloodGroup: dto.medical.bloodGroup as BloodGroup,
      allergies: dto.medical.allergies ?? undefined,
      conditions: dto.medical.conditions ?? undefined,
      medications: dto.medical.medications ?? undefined,
      doctorName: dto.medical.doctorName ?? undefined,
      doctorPhone: dto.medical.doctorPhone ?? undefined,
    },
    transport: {
      required: dto.transport.required,
      routeName: dto.transport.routeName ?? undefined,
      pickupPoint: dto.transport.pickupPoint ?? undefined,
    },
    hostel: {
      required: dto.hostel.required,
      hostelName: dto.hostel.hostelName ?? undefined,
      roomNumber: dto.hostel.roomNumber ?? undefined,
    },
    documents: dto.documents.map((d) => ({
      id: d.id,
      name: d.name,
      category: DOCUMENT_CATEGORY_FROM_API[d.category] ?? "other",
      uploadedAt: d.uploadedAt,
      fileDataUrl: d.fileDataUrl ?? undefined,
    })),
    transferRecord: dto.transferRecord
      ? {
          transferredAt: dto.transferRecord.transferredAt,
          toSchool: dto.transferRecord.toSchool,
          reason: dto.transferRecord.reason,
          transferCertificateNumber: dto.transferRecord.transferCertificateNumber,
        }
      : undefined,
  };
}

interface ApiAdmissionApplication {
  id: string;
  tenantId: string;
  branchId: string;
  applicationNumber: string;
  applicantFirstName: string;
  applicantLastName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  appliedClass: string;
  stage: string;
  submittedAt: string;
  notes: string | null;
  address: string | null;
  previousSchool: string | null;
  registeredAt: string | null;
  examDate: string | null;
  examScore: number | null;
  examStatus: string | null;
  interviewDate: string | null;
  interviewerName: string | null;
  interviewRating: number | null;
  interviewRemarks: string | null;
  decision: string | null;
  decisionRemarks: string | null;
  decidedAt: string | null;
  admissionFeeAmount: number | null;
  admissionFeePaid: boolean;
  admissionFeePaidOn: string | null;
  admissionFeeReceiptNumber: string | null;
  studentId: string | null;
  enrolledAt: string | null;
}

function mapAdmission(dto: ApiAdmissionApplication): AdmissionApplication {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    applicationNumber: dto.applicationNumber,
    applicantFirstName: dto.applicantFirstName,
    applicantLastName: dto.applicantLastName,
    dateOfBirth: dto.dateOfBirth,
    gender: GENDER_FROM_API[dto.gender] ?? "other",
    guardianName: dto.guardianName,
    guardianPhone: dto.guardianPhone,
    guardianEmail: dto.guardianEmail ?? undefined,
    appliedClass: dto.appliedClass,
    stage: ADMISSION_STAGE_FROM_API[dto.stage] ?? "inquiry",
    submittedAt: dto.submittedAt,
    notes: dto.notes ?? undefined,
    address: dto.address ?? undefined,
    previousSchool: dto.previousSchool ?? undefined,
    registeredAt: dto.registeredAt ?? undefined,
    examDate: dto.examDate ?? undefined,
    examScore: dto.examScore ?? undefined,
    examStatus: dto.examStatus ? (EXAM_STATUS_FROM_API[dto.examStatus] ?? undefined) : undefined,
    interviewDate: dto.interviewDate ?? undefined,
    interviewerName: dto.interviewerName ?? undefined,
    interviewRating: dto.interviewRating ?? undefined,
    interviewRemarks: dto.interviewRemarks ?? undefined,
    decision: dto.decision ? (SELECTION_DECISION_FROM_API[dto.decision] ?? undefined) : undefined,
    decisionRemarks: dto.decisionRemarks ?? undefined,
    decidedAt: dto.decidedAt ?? undefined,
    admissionFeeAmount: dto.admissionFeeAmount ?? undefined,
    admissionFeePaid: dto.admissionFeePaid,
    admissionFeePaidOn: dto.admissionFeePaidOn ?? undefined,
    admissionFeeReceiptNumber: dto.admissionFeeReceiptNumber ?? undefined,
    studentId: dto.studentId ?? undefined,
    enrolledAt: dto.enrolledAt ?? undefined,
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Students ─────────────────────────────────────────────────────────────
// Real AcademicService-backed (see docs/MICROSERVICES_PLAN.md).

export async function listStudents(): Promise<Student[]> {
  const [apiStudents, index] = await Promise.all([
    unwrap(academicHttpClient.get<ApiStudent[]>("/api/students")),
    buildSectionIndex(),
  ]);
  return apiStudents.map((s) => mapStudent(s, index));
}

export async function getStudent(id: string): Promise<Student> {
  const [dto, index] = await Promise.all([
    unwrap(academicHttpClient.get<ApiStudent>(`/api/students/${id}`)),
    buildSectionIndex(),
  ]);
  return mapStudent(dto, index);
}

export async function createStudent(values: StudentFormValues): Promise<Student> {
  const [sectionId, index] = await Promise.all([
    resolveSectionId(values.className, values.section, values.branchId),
    buildSectionIndex(),
  ]);
  const dto = await unwrap(
    academicHttpClient.post<ApiStudent>("/api/students", {
      branchId: values.branchId,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      dateOfBirth: values.dateOfBirth,
      gender: GENDER_TO_API[values.gender],
      sectionId,
      rollNumber: values.rollNumber?.trim() ?? null,
      address: values.address.trim(),
      guardianName: values.guardianName.trim(),
      guardianRelation: GUARDIAN_RELATION_TO_API[values.guardianRelation],
      guardianPhone: values.guardianPhone.trim(),
    }),
  );
  return mapStudent(dto, index);
}

export async function updateStudent(id: string, values: StudentFormValues): Promise<Student> {
  const [sectionId, index] = await Promise.all([
    resolveSectionId(values.className, values.section, values.branchId),
    buildSectionIndex(),
  ]);
  const dto = await unwrap(
    academicHttpClient.put<ApiStudent>(`/api/students/${id}`, {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      dateOfBirth: values.dateOfBirth,
      gender: GENDER_TO_API[values.gender],
      sectionId,
      rollNumber: values.rollNumber?.trim() ?? null,
      address: values.address.trim(),
    }),
  );
  return mapStudent(dto, index);
}

export async function updateGuardians(id: string, guardians: GuardianDetails[]): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(
    academicHttpClient.put<ApiStudent>(
      `/api/students/${id}/guardians`,
      guardians.map((g) => ({
        id: isRealGuardianId(g.id) ? g.id : null,
        name: g.name,
        relation: GUARDIAN_RELATION_TO_API[g.relation],
        phone: g.phone,
        email: g.email ?? null,
        occupation: g.occupation ?? null,
      })),
    ),
  );
  return mapStudent(dto, index);
}

export async function updateEmergencyContact(id: string, emergencyContact: EmergencyContact): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(academicHttpClient.put<ApiStudent>(`/api/students/${id}/emergency-contact`, emergencyContact));
  return mapStudent(dto, index);
}

export async function updateMedical(id: string, medical: MedicalInfo): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(
    academicHttpClient.put<ApiStudent>(`/api/students/${id}/medical`, {
      bloodGroup: medical.bloodGroup,
      allergies: medical.allergies ?? null,
      conditions: medical.conditions ?? null,
      medications: medical.medications ?? null,
      doctorName: medical.doctorName ?? null,
      doctorPhone: medical.doctorPhone ?? null,
    }),
  );
  return mapStudent(dto, index);
}

export async function updateTransport(id: string, transport: TransportDetails): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(
    academicHttpClient.put<ApiStudent>(`/api/students/${id}/transport`, {
      required: transport.required,
      routeName: transport.routeName ?? null,
      pickupPoint: transport.pickupPoint ?? null,
    }),
  );
  return mapStudent(dto, index);
}

export async function updateHostel(id: string, hostel: HostelDetails): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(
    academicHttpClient.put<ApiStudent>(`/api/students/${id}/hostel`, {
      required: hostel.required,
      hostelName: hostel.hostelName ?? null,
      roomNumber: hostel.roomNumber ?? null,
    }),
  );
  return mapStudent(dto, index);
}

export async function uploadStudentPhoto(id: string, photoUrl: string | null): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(academicHttpClient.put<ApiStudent>(`/api/students/${id}/photo`, { photoUrl }));
  return mapStudent(dto, index);
}

export async function uploadStudentDocument(
  id: string,
  doc: { name: string; category: StudentDocument["category"]; fileDataUrl?: string },
): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(
    academicHttpClient.post<ApiStudent>(`/api/students/${id}/documents`, {
      name: doc.name,
      category: DOCUMENT_CATEGORY_TO_API[doc.category],
      fileDataUrl: doc.fileDataUrl ?? null,
    }),
  );
  return mapStudent(dto, index);
}

export async function deleteStudentDocument(id: string, documentId: string): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(academicHttpClient.delete<ApiStudent>(`/api/students/${id}/documents/${documentId}`));
  return mapStudent(dto, index);
}

export async function transferStudent(id: string, values: TransferFormValues): Promise<Student> {
  const index = await buildSectionIndex();
  const dto = await unwrap(academicHttpClient.post<ApiStudent>(`/api/students/${id}/transfer`, values));
  return mapStudent(dto, index);
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
  // The backend promotes within the active branch (X-Branch-Id), so resolve sections there too.
  const branchId = getCurrentBranchId();
  const [fromSectionId, toSectionId] = await Promise.all([
    resolveSectionId(params.fromClass, params.fromSection, branchId),
    resolveSectionId(params.toClass, params.toSection, branchId),
  ]);
  return unwrap(academicHttpClient.post<PromotionResult>("/api/students/promote", { fromSectionId, toSectionId }));
}

export interface GraduationResult {
  graduatedCount: number;
}

export async function graduateStudents(className: string): Promise<GraduationResult> {
  const branchId = getCurrentBranchId();
  const classes = await listClasses();
  const schoolClass = classes.find((c) => c.name === className && c.branchId === branchId);
  if (!schoolClass) {
    throw new Error(`No class named "${className}" was found`);
  }
  return unwrap(academicHttpClient.post<GraduationResult>("/api/students/graduate", { classId: schoolClass.id }));
}

// ── Admissions: Inquiry → Registration → Entrance Exam → Interview → ─────
// ── Selection → Fee Collection → Student Creation, plus seat availability ─
// Real AcademicService-backed (see docs/MICROSERVICES_PLAN.md).

export async function listAdmissions(): Promise<AdmissionApplication[]> {
  const applications = await unwrap(academicHttpClient.get<ApiAdmissionApplication[]>("/api/admissions"));
  return applications.map(mapAdmission);
}

/** Step 1 — Inquiry: a lightweight first submission, before any review has happened. */
export async function createAdmission(values: AdmissionFormValues): Promise<AdmissionApplication> {
  const dto = await unwrap(
    academicHttpClient.post<ApiAdmissionApplication>("/api/admissions", {
      branchId: values.branchId,
      applicantFirstName: values.applicantFirstName,
      applicantLastName: values.applicantLastName,
      dateOfBirth: values.dateOfBirth,
      gender: GENDER_TO_API[values.gender],
      guardianName: values.guardianName,
      guardianPhone: values.guardianPhone,
      guardianEmail: values.guardianEmail ?? null,
      appliedClass: values.appliedClass,
      notes: values.notes ?? null,
    }),
  );
  return mapAdmission(dto);
}

/** Step 2 — Registration: the inquiry is formalized with full contact/history details. */
export async function registerAdmission(id: string, values: AdmissionRegistrationFormValues): Promise<AdmissionApplication> {
  const dto = await unwrap(
    academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/register`, {
      address: values.address,
      previousSchool: values.previousSchool ?? null,
    }),
  );
  return mapAdmission(dto);
}

/** Step 3 — Entrance Exam: schedule a date, then (re-open the same action) record the result. */
export async function updateAdmissionExam(id: string, values: AdmissionExamFormValues): Promise<AdmissionApplication> {
  const dto = await unwrap(
    academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/exam`, {
      examDate: values.examDate,
      examStatus: EXAM_STATUS_TO_API[values.examStatus],
      examScore: values.examScore ?? null,
    }),
  );
  return mapAdmission(dto);
}

/** Step 4 — Interview: schedule/record an interview against the exam-cleared applicant. */
export async function updateAdmissionInterview(id: string, values: AdmissionInterviewFormValues): Promise<AdmissionApplication> {
  const dto = await unwrap(
    academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/interview`, {
      interviewDate: values.interviewDate,
      interviewerName: values.interviewerName,
      interviewRating: values.interviewRating ?? null,
      interviewRemarks: values.interviewRemarks ?? null,
    }),
  );
  return mapAdmission(dto);
}

/**
 * Step 5 — Selection: the decision routes the application straight to its next stage —
 * "selected" moves to Fee Collection (with the standard admission fee applied), "waitlisted"
 * and "rejected" are terminal until/unless promoted from the waitlist.
 */
export async function decideAdmission(id: string, values: AdmissionDecisionFormValues): Promise<AdmissionApplication> {
  const dto = await unwrap(
    academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/decision`, {
      decision: SELECTION_DECISION_TO_API[values.decision],
      decisionRemarks: values.decisionRemarks ?? null,
    }),
  );
  return mapAdmission(dto);
}

/** A waitlisted applicant can be pulled back in once a seat frees up, re-entering at Fee Collection. */
export async function promoteFromWaitlist(id: string): Promise<AdmissionApplication> {
  const dto = await unwrap(academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/promote-from-waitlist`));
  return mapAdmission(dto);
}

/** Step 6 — Fee Collection: records payment. Enrollment (student creation) is a separate, explicit step. */
export async function recordAdmissionFeePayment(id: string, values: AdmissionFeePaymentFormValues): Promise<AdmissionApplication> {
  const dto = await unwrap(
    academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/fee-payment`, {
      amount: values.amount,
      paymentMode: values.paymentMode,
    }),
  );
  return mapAdmission(dto);
}

export async function rejectAdmission(id: string, remarks?: string): Promise<AdmissionApplication> {
  const dto = await unwrap(academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/reject`, { remarks: remarks ?? null }));
  return mapAdmission(dto);
}

export async function withdrawAdmission(id: string): Promise<AdmissionApplication> {
  const dto = await unwrap(academicHttpClient.post<ApiAdmissionApplication>(`/api/admissions/${id}/withdraw`));
  return mapAdmission(dto);
}

/** Step 7 — Student Creation: only reachable once the admission fee has actually been paid. */
export async function enrollAdmission(id: string): Promise<{ application: AdmissionApplication; student: Student }> {
  const [{ application, student }, index] = await Promise.all([
    unwrap(
      academicHttpClient.post<{ application: ApiAdmissionApplication; student: ApiStudent }>(`/api/admissions/${id}/enroll`),
    ),
    buildSectionIndex(),
  ]);
  return { application: mapAdmission(application), student: mapStudent(student, index) };
}

// ── Seat availability ────────────────────────────────────────────────────

/**
 * Aggregates the Academic Management module's real `Section` capacity/currentStrength per class
 * name (admissions apply for a class by name). Pass a `branchId` to count only that branch.
 */
export async function listSeatAvailability(branchId?: string): Promise<SeatAvailability[]> {
  const [allClasses, sections] = await Promise.all([listClasses(), listSections()]);
  const classes = branchId ? allClasses.filter((c) => c.branchId === branchId) : allClasses;
  const classNames = [...new Set(classes.map((c) => c.name))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );

  const result: SeatAvailability[] = classNames.map((className) => {
    const classIds = new Set(classes.filter((c) => c.name === className).map((c) => c.id));
    const classSections = sections.filter((s) => classIds.has(s.classId));
    const capacity = classSections.reduce((sum, s) => sum + s.capacity, 0);
    const currentStrength = classSections.reduce((sum, s) => sum + s.currentStrength, 0);
    return { className, capacity, currentStrength, availableSeats: Math.max(0, capacity - currentStrength) };
  });
  return result;
}

export async function getSeatAvailability(className: string): Promise<SeatAvailability | null> {
  const all = await listSeatAvailability();
  return all.find((s) => s.className === className) ?? null;
}
