export type CertificateType = "bonafide" | "transfer" | "character" | "study" | "achievement" | "staff_service";

export type RecipientType = "student" | "staff";

export interface CertificateTypeConfig {
  type: CertificateType;
  label: string;
  recipientType: RecipientType;
  prefix: string;
  description: string;
}

export interface IssuedCertificate {
  id: string;
  certificateNumber: string;
  type: CertificateType;
  recipientType: RecipientType;
  recipientId: string;
  recipientName: string;
  recipientSubtitle: string;
  issuedOn: string;
  bodyLines: string[];
  meta: Array<{ label: string; value: string }>;
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
