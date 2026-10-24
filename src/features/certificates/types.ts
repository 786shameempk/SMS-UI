export type CertificateType = "bonafide" | "transfer" | "character" | "study" | "achievement" | "staff_service";

export type RecipientType = "student" | "staff";

export interface CertificateTypeConfig {
  type: CertificateType;
  label: string;
  recipientType: RecipientType;
  prefix: string;
  description: string;
}

/** Valid until revoked (a mistake) or superseded (corrected by a newer certificate). */
export type CertificateStatus = "valid" | "revoked" | "superseded";

/** What the public verification page may show: no body text, nothing beyond who, what, which number and whether it still stands. */
export interface CertificateVerification {
  status: CertificateStatus;
  type: CertificateType;
  certificateNumber: string;
  recipientName: string;
  issuedOn: string;
  schoolName?: string;
  revokedAt?: string;
  replacementNumber?: string;
  replacementToken?: string;
}

export interface IssuedCertificate {
  id: string;
  tenantId: string;
  branchId: string;
  certificateNumber: string;
  type: CertificateType;
  recipientType: RecipientType;
  recipientId: string;
  recipientName: string;
  recipientSubtitle: string;
  issuedOn: string;
  bodyLines: string[];
  meta: Array<{ label: string; value: string }>;
  /** Printed as a QR code (and as text) so anyone holding the paper can check it. */
  verificationToken: string;
  status: CertificateStatus;
  schoolName?: string;
  revokedAt?: string;
  revokedReason?: string;
  replacedById?: string;
  replacesId?: string;
  verificationCount: number;
  lastVerifiedAt?: string;
}

export interface ReissueCertificateValues {
  reason: string;
  recipientName?: string;
  recipientSubtitle?: string;
  bodyLines?: string[];
}

export interface BonafideFormValues {
  studentId: string;
  purpose?: string;
}

export interface TransferCertificateFormValues {
  studentId: string;
}

export interface CharacterCertificateFormValues {
  studentId: string;
  purpose?: string;
}

export interface StudyCertificateFormValues {
  studentId: string;
  fromDate: string;
  toDate: string;
  purpose?: string;
}

export interface AchievementCertificateFormValues {
  studentId: string;
  event: string;
  achievement: string;
  eventDate: string;
}

export interface StaffServiceCertificateFormValues {
  staffId: string;
  purpose?: string;
}
