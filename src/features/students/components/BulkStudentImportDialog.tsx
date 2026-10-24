import { useTranslation } from "react-i18next";
import BulkImportDialog, { type ImportColumn, type ParsedRow } from "@/components/dialogs/BulkImportDialog";
import { normalizeDate } from "@/utils/csvParse";
import { getCurrentBranchId } from "@/utils/tenant";
import { createStudent } from "../api";
import { GUARDIAN_RELATIONS } from "../constants";
import type { Gender, StudentFormValues } from "../types";

const COLUMNS: ImportColumn[] = [
  { key: "firstName", label: "First name", required: true, example: "Rahul" },
  { key: "lastName", label: "Last name", required: true, example: "Menon" },
  { key: "dateOfBirth", label: "Date of birth", required: true, example: "2014-08-21" },
  { key: "gender", label: "Gender", required: true, example: "male" },
  { key: "className", label: "Class", required: true, example: "Class 5" },
  { key: "section", label: "Section", required: true, example: "A" },
  { key: "rollNumber", label: "Roll number", example: "12" },
  { key: "address", label: "Address", required: true, example: "12 Park Road" },
  { key: "guardianName", label: "Guardian name", required: true, example: "Suresh Menon" },
  { key: "guardianRelation", label: "Guardian relation", required: true, example: "father" },
  { key: "guardianPhone", label: "Guardian phone", required: true, example: "9876543210" },
  { key: "studentEmail", label: "Student email", example: "" },
  { key: "parentEmail", label: "Parent email", example: "suresh@example.com" },
];

const GENDERS: Gender[] = ["male", "female", "other"];
const EMAIL = /^\S+@\S+\.\S+$/;

/** Translator for row errors; defaults to plain English with {{placeholders}} filled in. */
type Translate = (key: string, options?: Record<string, string>) => string;
const plainEnglish: Translate = (key, options) => key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? "");

// Column labels stay English: they are the CSV header names the importer matches on.
export function parseStudentRow(r: Record<string, string>, t: Translate = plainEnglish): ParsedRow<StudentFormValues> {
  const missing = COLUMNS.filter((c) => c.required && !r[c.key]).map((c) => c.label);
  if (missing.length) return { ok: false, error: t("Missing {{fields}}", { fields: missing.join(", ") }) };
  const dateOfBirth = normalizeDate(r.dateOfBirth);
  if (!dateOfBirth) return { ok: false, error: t('Date of birth "{{value}}" is not a valid date', { value: r.dateOfBirth }) };
  const gender = GENDERS.find((g) => g === r.gender.toLowerCase());
  if (!gender) return { ok: false, error: t("Gender must be {{options}}", { options: GENDERS.join(", ") }) };
  const guardianRelation = GUARDIAN_RELATIONS.find((g) => g === r.guardianRelation.toLowerCase());
  if (!guardianRelation) return { ok: false, error: t("Guardian relation must be {{options}}", { options: GUARDIAN_RELATIONS.join(", ") }) };
  for (const key of ["studentEmail", "parentEmail"] as const) {
    if (r[key] && !EMAIL.test(r[key])) return { ok: false, error: key === "studentEmail" ? t('Student email "{{value}}" is not valid', { value: r[key] }) : t('Parent email "{{value}}" is not valid', { value: r[key] }) };
  }
  return {
    ok: true,
    value: {
      branchId: getCurrentBranchId(),
      firstName: r.firstName,
      lastName: r.lastName,
      dateOfBirth,
      gender,
      className: r.className,
      section: r.section,
      rollNumber: r.rollNumber || undefined,
      address: r.address,
      guardianName: r.guardianName,
      guardianRelation,
      guardianPhone: r.guardianPhone,
      studentEmail: r.studentEmail || undefined,
      parentEmail: r.parentEmail || undefined,
    },
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished: () => void;
}

export default function BulkStudentImportDialog({ open, onOpenChange, onFinished }: Props) {
  const { t } = useTranslation("students");
  return (
    <BulkImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("Import students")}
      description={t("Register many students from a CSV file. Class and section must already exist. An email creates a login for that student or parent.")}
      templateFileName="students-import-template"
      columns={COLUMNS}
      parseRow={(r) => parseStudentRow(r, t)}
      importRow={createStudent}
      onFinished={onFinished}
    />
  );
}
