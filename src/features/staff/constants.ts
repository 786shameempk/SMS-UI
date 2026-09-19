import type { LeaveType, StaffDesignation } from "./types";

export const DESIGNATIONS: StaffDesignation[] = [
  "Teacher",
  "Principal",
  "Vice Principal",
  "Accountant",
  "Receptionist",
  "Librarian",
  "Driver",
  "Warden",
  "Cleaner",
  "Security",
  "HR",
  "IT Support",
];

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "sick", label: "Sick leave" },
  { value: "casual", label: "Casual leave" },
  { value: "earned", label: "Earned leave" },
  { value: "unpaid", label: "Unpaid leave" },
];

export const DOCUMENT_CATEGORIES = [
  { value: "id_proof", label: "ID Proof" },
  { value: "resume", label: "Resume" },
  { value: "certificate", label: "Certificate" },
  { value: "contract", label: "Contract" },
  { value: "other", label: "Other" },
] as const;
