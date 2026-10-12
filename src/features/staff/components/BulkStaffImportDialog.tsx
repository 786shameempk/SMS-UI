import BulkImportDialog, { type ImportColumn, type ParsedRow } from "@/components/dialogs/BulkImportDialog";
import { normalizeDate } from "@/utils/csvParse";
import { getCurrentBranchId } from "@/utils/tenant";
import { createStaff } from "../api";
import { DESIGNATIONS } from "../constants";
import type { Gender, StaffFormValues } from "../types";

const COLUMNS: ImportColumn[] = [
  { key: "firstName", label: "First name", required: true, example: "Asha" },
  { key: "lastName", label: "Last name", required: true, example: "Nair" },
  { key: "dateOfBirth", label: "Date of birth", required: true, example: "1990-04-15" },
  { key: "gender", label: "Gender", required: true, example: "female" },
  { key: "designation", label: "Designation", required: true, example: "Teacher" },
  { key: "department", label: "Department", required: true, example: "Science" },
  { key: "phone", label: "Phone", required: true, example: "9876543210" },
  { key: "email", label: "Email", required: true, example: "asha.nair@example.com" },
  { key: "address", label: "Address", example: "12 Park Road" },
];

const GENDERS: Gender[] = ["male", "female", "other"];

export function parseStaffRow(r: Record<string, string>): ParsedRow<StaffFormValues> {
  const missing = COLUMNS.filter((c) => c.required && !r[c.key]).map((c) => c.label);
  if (missing.length) return { ok: false, error: `Missing ${missing.join(", ")}` };
  const dateOfBirth = normalizeDate(r.dateOfBirth);
  if (!dateOfBirth) return { ok: false, error: `Date of birth "${r.dateOfBirth}" is not a valid date` };
  const gender = GENDERS.find((g) => g === r.gender.toLowerCase());
  if (!gender) return { ok: false, error: `Gender must be ${GENDERS.join(", ")}` };
  const designation = DESIGNATIONS.find((d) => d.toLowerCase() === r.designation.toLowerCase());
  if (!designation) return { ok: false, error: `Designation "${r.designation}" is not one of: ${DESIGNATIONS.join(", ")}` };
  if (!/^\S+@\S+\.\S+$/.test(r.email)) return { ok: false, error: `Email "${r.email}" is not valid` };
  return {
    ok: true,
    value: {
      branchId: getCurrentBranchId(),
      firstName: r.firstName,
      lastName: r.lastName,
      dateOfBirth,
      gender,
      designation,
      department: r.department,
      phone: r.phone,
      email: r.email,
      address: r.address,
    },
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished: () => void;
}

export default function BulkStaffImportDialog({ open, onOpenChange, onFinished }: Props) {
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import staff"
      description={`Add many staff members from a CSV file. Designation is one of: ${DESIGNATIONS.join(", ")}.`}
      templateFileName="staff-import-template"
      columns={COLUMNS}
      parseRow={parseStaffRow}
      importRow={createStaff}
      onFinished={onFinished}
    />
  );
}
