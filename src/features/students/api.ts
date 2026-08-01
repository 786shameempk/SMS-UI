import { mockDelay } from "@/utils/mockDelay";
import { SEED_ADMISSIONS, SEED_STUDENTS } from "./mock";
import { FINAL_CLASS } from "./constants";
import type {
  AdmissionApplication,
  AdmissionFormValues,
  AdmissionStatus,
  EmergencyContact,
  GuardianDetails,
  HostelDetails,
  MedicalInfo,
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

let students = loadJson<Student[]>(STUDENTS_KEY, SEED_STUDENTS.map((s) => ({ ...s })));
let admissions = loadJson<AdmissionApplication[]>(ADMISSIONS_KEY, SEED_ADMISSIONS.map((a) => ({ ...a })));

function persistStudents() {
  saveJson(STUDENTS_KEY, students);
}
function persistAdmissions() {
  saveJson(ADMISSIONS_KEY, admissions);
}

function nextAdmissionNumber(): string {
  const year = new Date().getFullYear();
  const max = students.reduce((acc, s) => {
    const match = s.admissionNumber.match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `EDU-${year}-${String(max + 1).padStart(4, "0")}`;
}

function requireStudent(id: string): Student {
  const student = students.find((s) => s.id === id);
  if (!student) throw new Error("Student not found");
  return student;
}

function buildStudentFromValues(values: StudentFormValues): Student {
  return {
    id: `stu-${Math.random().toString(36).slice(2, 9)}`,
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
  return mockDelay([...students], 400);
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
  students = students.map((s) => {
    if (s.status === "active" && s.className === params.fromClass && s.section === params.fromSection) {
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
  students = students.map((s) => {
    if (s.status === "active" && s.className === className) {
      count++;
      return { ...s, status: "graduated" as const };
    }
    return s;
  });
  persistStudents();
  return mockDelay({ graduatedCount: count }, 500);
}

// ── Admissions ───────────────────────────────────────────────────────────

export async function listAdmissions(): Promise<AdmissionApplication[]> {
  return mockDelay([...admissions], 400);
}

export async function createAdmission(values: AdmissionFormValues): Promise<AdmissionApplication> {
  const application: AdmissionApplication = {
    id: `adm-${Math.random().toString(36).slice(2, 8)}`,
    ...values,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  admissions = [application, ...admissions];
  persistAdmissions();
  return mockDelay(application, 450);
}

export async function setAdmissionStatus(id: string, status: AdmissionStatus): Promise<AdmissionApplication> {
  const idx = admissions.findIndex((a) => a.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Application not found");
  }
  const updated = { ...admissions[idx], status };
  admissions = admissions.map((a) => (a.id === id ? updated : a));
  persistAdmissions();
  return mockDelay(updated, 400);
}

export async function approveAdmission(id: string): Promise<{ application: AdmissionApplication; student: Student }> {
  const application = admissions.find((a) => a.id === id);
  if (!application) {
    await mockDelay(null, 300);
    throw new Error("Application not found");
  }
  const student = buildStudentFromValues({
    firstName: application.applicantFirstName,
    lastName: application.applicantLastName,
    dateOfBirth: application.dateOfBirth,
    gender: application.gender,
    className: application.appliedClass,
    section: "A",
    address: "",
    guardianName: application.guardianName,
    guardianRelation: "guardian",
    guardianPhone: application.guardianPhone,
  });
  students = [student, ...students];
  persistStudents();

  const updatedApplication = { ...application, status: "approved" as const };
  admissions = admissions.map((a) => (a.id === id ? updatedApplication : a));
  persistAdmissions();

  return mockDelay({ application: updatedApplication, student }, 500);
}
