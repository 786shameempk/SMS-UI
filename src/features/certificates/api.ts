import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import type {
  AchievementCertificateFormValues,
  BonafideFormValues,
  CertificateStatus,
  CertificateType,
  CertificateVerification,
  CharacterCertificateFormValues,
  IssuedCertificate,
  RecipientType,
  ReissueCertificateValues,
  StaffServiceCertificateFormValues,
  StudyCertificateFormValues,
  TransferCertificateFormValues,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase/snake_case unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const TYPE_TO_API: Record<CertificateType, string> = {
  bonafide: "Bonafide",
  transfer: "Transfer",
  character: "Character",
  study: "Study",
  achievement: "Achievement",
  staff_service: "StaffService",
};
const TYPE_FROM_API: Record<string, CertificateType> = {
  Bonafide: "bonafide",
  Transfer: "transfer",
  Character: "character",
  Study: "study",
  Achievement: "achievement",
  StaffService: "staff_service",
};

const STATUS_FROM_API: Record<string, CertificateStatus> = { Valid: "valid", Revoked: "revoked", Superseded: "superseded" };

const RECIPIENT_TO_API: Record<RecipientType, string> = { student: "Student", staff: "Staff" };
const RECIPIENT_FROM_API: Record<string, RecipientType> = { Student: "student", Staff: "staff" };

interface ApiIssuedCertificate {
  id: string;
  tenantId: string;
  branchId: string;
  certificateNumber: string;
  type: string;
  recipientType: string;
  recipientId: string;
  recipientName: string;
  recipientSubtitle: string;
  issuedOn: string;
  bodyLines: string[];
  meta: Array<{ label: string; value: string }>;
  verificationToken?: string;
  status?: string;
  schoolName?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
  replacedById?: string | null;
  replacesId?: string | null;
  verificationCount?: number;
  lastVerifiedAt?: string | null;
}

interface ApiCertificateVerification {
  status: string;
  type: string;
  certificateNumber: string;
  recipientName: string;
  issuedOn: string;
  schoolName?: string | null;
  revokedAt?: string | null;
  replacementNumber?: string | null;
  replacementToken?: string | null;
}

function mapCertificate(dto: ApiIssuedCertificate): IssuedCertificate {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    certificateNumber: dto.certificateNumber,
    type: TYPE_FROM_API[dto.type] ?? "bonafide",
    recipientType: RECIPIENT_FROM_API[dto.recipientType] ?? "student",
    recipientId: dto.recipientId,
    recipientName: dto.recipientName,
    recipientSubtitle: dto.recipientSubtitle,
    issuedOn: dto.issuedOn,
    bodyLines: dto.bodyLines,
    meta: dto.meta,
    verificationToken: dto.verificationToken ?? "",
    status: STATUS_FROM_API[dto.status ?? "Valid"] ?? "valid",
    schoolName: dto.schoolName ?? undefined,
    revokedAt: dto.revokedAt ?? undefined,
    revokedReason: dto.revokedReason ?? undefined,
    replacedById: dto.replacedById ?? undefined,
    replacesId: dto.replacesId ?? undefined,
    verificationCount: dto.verificationCount ?? 0,
    lastVerifiedAt: dto.lastVerifiedAt ?? undefined,
  };
}

/** The school's name goes onto the certificate record so the public verification page can say who issued it. Set by the page that generates. */
let issuingSchoolName: string | undefined;
export function setIssuingSchoolName(name: string | undefined) {
  issuingSchoolName = name?.trim() || undefined;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function formalDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
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

interface CertificateSnapshot {
  type: CertificateType;
  recipientType: RecipientType;
  recipientId: string;
  recipientName: string;
  recipientSubtitle: string;
  bodyLines: string[];
  meta: Array<{ label: string; value: string }>;
  certificateNumberOverride?: string;
}

/**
 * Certificates are frozen snapshots: the wording is composed here from AcademicService's student/staff
 * data (which CampusService can't read), and CampusService stores it and assigns the sequential number.
 */
async function issue(snapshot: CertificateSnapshot): Promise<IssuedCertificate> {
  const dto = await unwrap(
    campusHttpClient.post<ApiIssuedCertificate>("/api/issuedcertificates", {
      ...snapshot,
      type: TYPE_TO_API[snapshot.type],
      recipientType: RECIPIENT_TO_API[snapshot.recipientType],
      certificateNumberOverride: snapshot.certificateNumberOverride || null,
      schoolName: issuingSchoolName ?? null,
    }),
  );
  return mapCertificate(dto);
}

function studentRecipient(student: Student) {
  return {
    recipientType: "student" as const,
    recipientId: student.id,
    recipientName: `${student.firstName} ${student.lastName}`,
    recipientSubtitle: `${student.className} - ${student.section} · ${student.admissionNumber}`,
  };
}

// ── Issued log ───────────────────────────────────────────────────────────

export async function listIssuedCertificates(): Promise<IssuedCertificate[]> {
  const certificates = await unwrap(campusHttpClient.get<ApiIssuedCertificate[]>("/api/issuedcertificates"));
  return certificates.map(mapCertificate);
}

export async function getIssuedCertificate(id: string): Promise<IssuedCertificate> {
  const dto = await unwrap(campusHttpClient.get<ApiIssuedCertificate>(`/api/issuedcertificates/${id}`));
  return mapCertificate(dto);
}

export async function revokeCertificate(id: string, reason: string): Promise<IssuedCertificate> {
  return mapCertificate(await unwrap(campusHttpClient.post<ApiIssuedCertificate>(`/api/issuedcertificates/${id}/revoke`, { reason })));
}

/** Issues a corrected certificate (new number, new QR code) and marks this one as replaced. Anything left out is copied from the original. */
export async function reissueCertificate(id: string, values: ReissueCertificateValues): Promise<IssuedCertificate> {
  return mapCertificate(
    await unwrap(campusHttpClient.post<ApiIssuedCertificate>(`/api/issuedcertificates/${id}/reissue`, { ...values, schoolName: issuingSchoolName ?? null })),
  );
}

/**
 * Anonymous: used by the public page a certificate's QR code opens. A 404 (unknown or mistyped code) is the expected "not ours" answer,
 * so no error toast; the caller shows it.
 */
export async function verifyCertificate(token: string): Promise<CertificateVerification | null> {
  try {
    const { data } = await campusHttpClient.get<ApiCertificateVerification>(`/api/public/certificates/${encodeURIComponent(token.trim())}`, { silentErrors: true });
    return {
      status: STATUS_FROM_API[data.status] ?? "revoked",
      type: TYPE_FROM_API[data.type] ?? "bonafide",
      certificateNumber: data.certificateNumber,
      recipientName: data.recipientName,
      issuedOn: data.issuedOn,
      schoolName: data.schoolName ?? undefined,
      revokedAt: data.revokedAt ?? undefined,
      replacementNumber: data.replacementNumber ?? undefined,
      replacementToken: data.replacementToken ?? undefined,
    };
  } catch (err) {
    if ((err as { response?: { status?: number } }).response?.status === 404) return null;
    throw new Error(extractApiErrorMessage(err));
  }
}

export async function deleteIssuedCertificate(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/issuedcertificates/${id}`));
}

// ── Generators ───────────────────────────────────────────────────────────

export async function generateBonafide(values: BonafideFormValues): Promise<IssuedCertificate> {
  const student = requireStudent(await listStudents(), values.studentId);

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, is a bonafide student of this institution, currently studying in ${student.className} - ${student.section}.`,
    `The student was admitted to this institution on ${formalDate(student.admissionDate)} and is presently in good standing.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  return issue({
    type: "bonafide",
    ...studentRecipient(student),
    bodyLines,
    meta: [{ label: "Purpose", value: values.purpose?.trim() || "General" }],
  });
}

export async function generateTransferCertificate(values: TransferCertificateFormValues): Promise<IssuedCertificate> {
  const student = requireStudent(await listStudents(), values.studentId);
  if (!student.transferRecord) {
    throw new Error("This student has no transfer record yet — transfer them out from Student Management first");
  }
  const record = student.transferRecord;

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, was a student of this institution from ${formalDate(student.admissionDate)} to ${formalDate(record.transferredAt)}, last studying in ${student.className} - ${student.section}.`,
    `The student is being transferred to ${record.toSchool}.`,
    `Reason for transfer: ${record.reason}.`,
  ];

  return issue({
    type: "transfer",
    ...studentRecipient(student),
    bodyLines,
    meta: [
      { label: "Transferring to", value: record.toSchool },
      { label: "Reason", value: record.reason },
    ],
    certificateNumberOverride: record.transferCertificateNumber,
  });
}

export async function generateCharacterCertificate(values: CharacterCertificateFormValues): Promise<IssuedCertificate> {
  const student = requireStudent(await listStudents(), values.studentId);

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, a student of ${student.className} - ${student.section}, has been a student of this institution and, to the best of our knowledge, bears a good moral character.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  return issue({
    type: "character",
    ...studentRecipient(student),
    bodyLines,
    meta: [{ label: "Purpose", value: values.purpose?.trim() || "General" }],
  });
}

export async function generateStudyCertificate(values: StudyCertificateFormValues): Promise<IssuedCertificate> {
  const student = requireStudent(await listStudents(), values.studentId);
  if (new Date(values.toDate) < new Date(values.fromDate)) {
    throw new Error("End date can't be before the start date");
  }

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, admission number ${student.admissionNumber}, studied at this institution from ${formalDate(values.fromDate)} to ${formalDate(values.toDate)}, in ${student.className} - ${student.section}.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  return issue({
    type: "study",
    ...studentRecipient(student),
    bodyLines,
    meta: [
      { label: "Period", value: `${formalDate(values.fromDate)} – ${formalDate(values.toDate)}` },
      { label: "Purpose", value: values.purpose?.trim() || "General" },
    ],
  });
}

export async function generateAchievementCertificate(values: AchievementCertificateFormValues): Promise<IssuedCertificate> {
  const student = requireStudent(await listStudents(), values.studentId);

  const bodyLines = [
    `This is to certify that ${student.firstName} ${student.lastName}, a student of ${student.className} - ${student.section}, has successfully participated in ${values.event.trim()} held on ${formalDate(values.eventDate)}.`,
    `In recognition of this, the student is awarded: ${values.achievement.trim()}.`,
  ];

  return issue({
    type: "achievement",
    ...studentRecipient(student),
    bodyLines,
    meta: [
      { label: "Event", value: values.event.trim() },
      { label: "Achievement", value: values.achievement.trim() },
      { label: "Event date", value: formalDate(values.eventDate) },
    ],
  });
}

export async function generateStaffServiceCertificate(values: StaffServiceCertificateFormValues): Promise<IssuedCertificate> {
  const member = requireStaffMember(await listStaff(), values.staffId);

  const servicePeriod = member.resignation
    ? `from ${formalDate(member.joiningDate)} to ${formalDate(member.resignation.lastWorkingDate)}`
    : `since ${formalDate(member.joiningDate)}, and continues to be employed here`;

  const bodyLines = [
    `This is to certify that ${member.firstName} ${member.lastName}, employee ID ${member.employeeId}, has been employed at this institution as ${member.designation} in the ${member.department} department, ${servicePeriod}.`,
  ];
  if (values.purpose?.trim()) bodyLines.push(`This certificate is issued for the purpose of ${values.purpose.trim()}.`);

  return issue({
    type: "staff_service",
    recipientType: "staff",
    recipientId: member.id,
    recipientName: `${member.firstName} ${member.lastName}`,
    recipientSubtitle: `${member.designation} · ${member.employeeId}`,
    bodyLines,
    meta: [{ label: "Purpose", value: values.purpose?.trim() || "General" }],
  });
}
