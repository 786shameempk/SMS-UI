import type { CertificateType, CertificateTypeConfig } from "./types";

export const CERTIFICATE_TYPE_CONFIG: Record<CertificateType, CertificateTypeConfig> = {
  bonafide: {
    type: "bonafide",
    label: "Bonafide Certificate",
    recipientType: "student",
    prefix: "BON",
    description: "Confirms a student is currently enrolled.",
  },
  transfer: {
    type: "transfer",
    label: "Transfer Certificate",
    recipientType: "student",
    prefix: "TC",
    description: "Issued when a student leaves the school — uses the transfer record from Student Management.",
  },
  character: {
    type: "character",
    label: "Character Certificate",
    recipientType: "student",
    prefix: "CHR",
    description: "Confirms a student's conduct while enrolled.",
  },
  study: {
    type: "study",
    label: "Study Certificate",
    recipientType: "student",
    prefix: "STD",
    description: "Confirms a student studied at the school during a given period.",
  },
  achievement: {
    type: "achievement",
    label: "Achievement Certificate",
    recipientType: "student",
    prefix: "ACH",
    description: "Recognizes participation or achievement in an event or competition.",
  },
  staff_service: {
    type: "staff_service",
    label: "Staff Service Certificate",
    recipientType: "staff",
    prefix: "SVC",
    description: "Confirms a staff member's period of employment.",
  },
};

export const CERTIFICATE_TYPE_OPTIONS: CertificateTypeConfig[] = Object.values(CERTIFICATE_TYPE_CONFIG);
