import type { LeaveType, StaffDesignation, StaffLoginRole } from "./types";

export const DESIGNATIONS: StaffDesignation[] = [
  "Teacher",
  "Principal",
  "Vice Principal",
  "Accountant",
  "Receptionist",
  "Librarian",
  "Driver",
  "Warden",
  "Nurse",
  "Cleaner",
  "Security",
  "HR",
  "IT Support",
];

/** Roles a joiner can sign in with (the sign-in service has no HR, nurse, driver... roles of its own). */
export const STAFF_LOGIN_ROLES: { value: StaffLoginRole; label: string }[] = [
  { value: "teacher", label: "Teacher" },
  { value: "principal", label: "Principal" },
  { value: "accountant", label: "Accountant" },
  { value: "librarian", label: "Librarian" },
  { value: "receptionist", label: "Receptionist" },
];

/** The login role a designation gets automatically; designations missing here get no login unless one is chosen. */
export const DESIGNATION_LOGIN_ROLE: Partial<Record<StaffDesignation, StaffLoginRole>> = {
  Teacher: "teacher",
  Principal: "principal",
  "Vice Principal": "principal",
  Accountant: "accountant",
  Librarian: "librarian",
  Receptionist: "receptionist",
};

/** Matches a CSV cell (case-insensitive) to a login role; empty means automatic, anything else is invalid (null). */
export function parseLoginRole(value: string | undefined): StaffLoginRole | "" | null {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "";
  return STAFF_LOGIN_ROLES.find((r) => r.value === v)?.value ?? null;
}

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
