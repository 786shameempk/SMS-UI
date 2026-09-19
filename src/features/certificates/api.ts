import { mockDelay } from "@/utils/mockDelay";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { CERTIFICATE_TYPE_CONFIG } from "./constants";
import type {
  AchievementCertificateFormValues,
  BonafideFormValues,
  CertificateType,
  CharacterCertificateFormValues,
  IssuedCertificate,
  StaffServiceCertificateFormValues,
  StudyCertificateFormValues,
  TransferCertificateFormValues,
} from "./types";

const CERTIFICATES_KEY = "sms-mock-certificates-issued";

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

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let certificates = loadJson<IssuedCertificate[]>(CERTIFICATES_KEY, []);
const persistCertificates = () => saveJson(CERTIFICATES_KEY, certificates);

function formalDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function nextCertificateNumber(type: CertificateType): string {
  const prefix = CERTIFICATE_TYPE_CONFIG[type].prefix;
  const year = new Date().getFullYear();
  const max = certificates
    .filter((c) => c.type === type)
    .reduce((acc, c) => {
      const match = c.certificateNumber.match(/(\d+)$/);
      return match ? Math.max(acc, Number(match[1])) : acc;
    }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

function requireStudent(students: Student[], id: string): Student {
  const student = students.find((s) => s.id === id);
  if (!student) throw new Error("Student not found");
  return student;
}

function requireStaffMember(staff: StaffMember[], id: string): StaffMember {
  const member = staff.find((s) => s.id === id);
  if (!member) throw new Error("Staff member not found");
  return member;
}

function issue(certificate: IssuedCertificate): IssuedCertificate {
  certificates = [certificate, ...certificates];
  persistCertificates();
  return certificate;
}

// ── Issued certificates ─────────────────────────────────────────────────

export async function listIssuedCertificates(): Promise<IssuedCertificate[]> {
  return mockDelay(
    [...certificates].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)),
    350,
  );
}

export async function getIssuedCertificate(id: string): Promise<IssuedCertificate> {
  const found = certificates.find((c) => c.id === id);
  if (!found) throw new Error("Certificate not found");
  return mockDelay(found, 250);
}

export async function deleteIssuedCertificate(id: string): Promise<void> {
  if (!certificates.some((c) => c.id === id)) throw new Error("Certificate not found");
  certificates = certificates.filter((c) => c.id !== id);
  persistCertificates();
  return mockDelay(undefined, 300);
}

// ── Generators ───────────────────────────────────────────────────────────

export async function generateBonafide(values: BonafideFormValues): Promise<IssuedCertificate> {
  const students = await listStudents();
  const student = requireStudent(students, values.studentId);
  const now = new Date().toISOString();

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, is a bonafide student of this institution, currently studying in ${student.className} - ${student.section}.`,
    `The student was admitted to this institution on ${formalDate(student.admissionDate)} and is presently in good standing.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  const certificate: IssuedCertificate = {
    id: genId("cert"),
    certificateNumber: nextCertificateNumber("bonafide"),
    type: "bonafide",
    recipientType: "student",
    recipientId: student.id,
    recipientName: `${student.firstName} ${student.lastName}`,
    recipientSubtitle: `${student.className} - ${student.section} · ${student.admissionNumber}`,
    issuedOn: now,
    bodyLines,
    meta: [{ label: "Purpose", value: values.purpose?.trim() || "General" }],
  };
  return mockDelay(issue(certificate), 500);
}

export async function generateTransferCertificate(values: TransferCertificateFormValues): Promise<IssuedCertificate> {
  const students = await listStudents();
  const student = requireStudent(students, values.studentId);
  if (!student.transferRecord) {
    await mockDelay(null, 300);
    throw new Error("This student has no transfer record yet — transfer them out from Student Management first");
  }
  const now = new Date().toISOString();
  const record = student.transferRecord;

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, was a student of this institution from ${formalDate(student.admissionDate)} to ${formalDate(record.transferredAt)}, last studying in ${student.className} - ${student.section}.`,
    `The student is being transferred to ${record.toSchool}.`,
    `Reason for transfer: ${record.reason}.`,
  ];

  const certificate: IssuedCertificate = {
    id: genId("cert"),
    certificateNumber: record.transferCertificateNumber || nextCertificateNumber("transfer"),
    type: "transfer",
    recipientType: "student",
    recipientId: student.id,
    recipientName: `${student.firstName} ${student.lastName}`,
    recipientSubtitle: `${student.className} - ${student.section} · ${student.admissionNumber}`,
    issuedOn: now,
    bodyLines,
    meta: [
      { label: "Transferring to", value: record.toSchool },
      { label: "Reason", value: record.reason },
    ],
  };
  return mockDelay(issue(certificate), 500);
}

export async function generateCharacterCertificate(values: CharacterCertificateFormValues): Promise<IssuedCertificate> {
  const students = await listStudents();
  const student = requireStudent(students, values.studentId);
  const now = new Date().toISOString();

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, a student of ${student.className} - ${student.section}, has been a student of this institution and, to the best of our knowledge, bears a good moral character.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  const certificate: IssuedCertificate = {
    id: genId("cert"),
    certificateNumber: nextCertificateNumber("character"),
    type: "character",
    recipientType: "student",
    recipientId: student.id,
    recipientName: `${student.firstName} ${student.lastName}`,
    recipientSubtitle: `${student.className} - ${student.section} · ${student.admissionNumber}`,
    issuedOn: now,
    bodyLines,
    meta: [{ label: "Purpose", value: values.purpose?.trim() || "General" }],
  };
  return mockDelay(issue(certificate), 500);
}

export async function generateStudyCertificate(values: StudyCertificateFormValues): Promise<IssuedCertificate> {
  const students = await listStudents();
  const student = requireStudent(students, values.studentId);
  if (new Date(values.toDate) < new Date(values.fromDate)) {
    await mockDelay(null, 300);
    throw new Error("End date can't be before the start date");
  }
  const now = new Date().toISOString();

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, studied at this institution from ${formalDate(values.fromDate)} to ${formalDate(values.toDate)}, in ${student.className} - ${student.section}.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  const certificate: IssuedCertificate = {
    id: genId("cert"),
    certificateNumber: nextCertificateNumber("study"),
    type: "study",
    recipientType: "student",
    recipientId: student.id,
    recipientName: `${student.firstName} ${student.lastName}`,
    recipientSubtitle: `${student.className} - ${student.section} · ${student.admissionNumber}`,
    issuedOn: now,
    bodyLines,
    meta: [
      { label: "Period", value: `${formalDate(values.fromDate)} – ${formalDate(values.toDate)}` },
      { label: "Purpose", value: values.purpose?.trim() || "General" },
    ],
  };
  return mockDelay(issue(certificate), 500);
}

export async function generateAchievementCertificate(values: AchievementCertificateFormValues): Promise<IssuedCertificate> {
  const students = await listStudents();
  const student = requireStudent(students, values.studentId);
  const now = new Date().toISOString();

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, a student of ${student.className} - ${student.section}, has successfully participated in ${values.event.trim()} held on ${formalDate(values.eventDate)}.`,
    `In recognition of this, the student is awarded: ${values.achievement.trim()}.`,
  ];

  const certificate: IssuedCertificate = {
    id: genId("cert"),
    certificateNumber: nextCertificateNumber("achievement"),
    type: "achievement",
    recipientType: "student",
    recipientId: student.id,
    recipientName: `${student.firstName} ${student.lastName}`,
    recipientSubtitle: `${student.className} - ${student.section} · ${student.admissionNumber}`,
    issuedOn: now,
    bodyLines,
    meta: [
      { label: "Event", value: values.event.trim() },
      { label: "Achievement", value: values.achievement.trim() },
      { label: "Event date", value: formalDate(values.eventDate) },
    ],
  };
  return mockDelay(issue(certificate), 500);
}

export async function generateStaffServiceCertificate(values: StaffServiceCertificateFormValues): Promise<IssuedCertificate> {
  const staff = await listStaff();
  const member = requireStaffMember(staff, values.staffId);
  const now = new Date().toISOString();

  const servicePeriod = member.resignation
    ? `from ${formalDate(member.joiningDate)} to ${formalDate(member.resignation.lastWorkingDate)}`
    : `since ${formalDate(member.joiningDate)}, and continues to be employed here`;

  const bodyLines = [
    `This is to certify that ${member.firstName} ${member.lastName}, employee ID ${member.employeeId}, has been employed at this institution as ${member.designation} in the ${member.department} department, ${servicePeriod}.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  const certificate: IssuedCertificate = {
    id: genId("cert"),
    certificateNumber: nextCertificateNumber("staff_service"),
    type: "staff_service",
    recipientType: "staff",
    recipientId: member.id,
    recipientName: `${member.firstName} ${member.lastName}`,
    recipientSubtitle: `${member.designation} · ${member.employeeId}`,
    issuedOn: now,
    bodyLines,
    meta: [{ label: "Purpose", value: values.purpose?.trim() || "General" }],
  };
  return mockDelay(issue(certificate), 500);
}
