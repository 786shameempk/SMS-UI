/**
 * Class Management doesn't exist yet (it's a later module), so student records reference
 * this small local list of classes/sections for now. When Class Management ships, this
 * will be replaced the same way Users was wired to the real Roles module.
 */
export const CLASS_OPTIONS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export const SECTION_OPTIONS = ["A", "B", "C"] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"] as const;

export const GUARDIAN_RELATIONS = ["father", "mother", "guardian"] as const;

export const DOCUMENT_CATEGORIES = [
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "id_proof", label: "ID Proof" },
  { value: "photo", label: "Photo" },
  { value: "medical_record", label: "Medical Record" },
  { value: "other", label: "Other" },
] as const;

export function nextClass(className: string): string | null {
  const idx = CLASS_OPTIONS.indexOf(className as (typeof CLASS_OPTIONS)[number]);
  if (idx === -1 || idx === CLASS_OPTIONS.length - 1) return null;
  return CLASS_OPTIONS[idx + 1];
}

export const FINAL_CLASS = CLASS_OPTIONS[CLASS_OPTIONS.length - 1];
