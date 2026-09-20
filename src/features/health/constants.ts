import type { BmiCategory, VaccinationStatus, VisitOutcome } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const VISIT_OUTCOME_CONFIG: Record<VisitOutcome, { label: string; variant: BadgeVariant }> = {
  returned_to_class: { label: "Returned to class", variant: "success" },
  sent_home: { label: "Sent home", variant: "warning" },
  referred_to_hospital: { label: "Referred to hospital", variant: "danger" },
  admitted_to_infirmary: { label: "Admitted to infirmary", variant: "info" },
};

export const VISIT_OUTCOME_OPTIONS: Array<{ value: VisitOutcome; label: string }> = (
  Object.keys(VISIT_OUTCOME_CONFIG) as VisitOutcome[]
).map((value) => ({ value, label: VISIT_OUTCOME_CONFIG[value].label }));

export const VACCINATION_STATUS_CONFIG: Record<VaccinationStatus, { label: string; variant: BadgeVariant }> = {
  completed: { label: "Completed", variant: "success" },
  due: { label: "Due", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
};

/** Common school-age vaccines used to seed and suggest vaccination records. */
export const COMMON_VACCINES = ["MMR Booster", "Tdap Booster", "Hepatitis B", "Typhoid", "Varicella", "Influenza (Annual)"];

export function vaccinationStatus(record: { dateAdministered?: string; dueDate: string }): VaccinationStatus {
  if (record.dateAdministered) return "completed";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return new Date(record.dueDate) < todayStart ? "overdue" : "due";
}

export function calculateBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Standard adult BMI bands, used here as a simplified stand-in for the age/sex-specific
 * percentile charts real pediatric BMI screening uses — good enough for a demo checkup
 * record, not a substitute for a clinical growth-chart tool.
 */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export const BMI_CATEGORY_CONFIG: Record<BmiCategory, { label: string; variant: BadgeVariant }> = {
  underweight: { label: "Underweight", variant: "warning" },
  normal: { label: "Normal", variant: "success" },
  overweight: { label: "Overweight", variant: "warning" },
  obese: { label: "Obese", variant: "danger" },
};

/**
 * A `datetime-local` input's value must be local wall-clock time. Building it via
 * `toISOString()` shifts by the UTC offset (the same class of bug documented in
 * PROGRESS.md for month-key derivation), so this formats straight from local getters instead.
 */
export function nowLocalDateTimeValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function ageInYears(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
