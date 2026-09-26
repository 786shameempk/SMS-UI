import type { DraftScenario, InsightArea, RiskReason } from "./types";

export const ATTENDANCE_RISK_THRESHOLD = 75;
export const ACADEMIC_CGPA_RISK_THRESHOLD = 5;

export const RISK_REASON_CONFIG: Record<RiskReason, { label: string }> = {
  low_attendance: { label: "Low attendance" },
  academic_risk: { label: "Academic risk" },
  overdue_fees: { label: "Overdue fees" },
};

export const RISK_WEIGHTS: Record<RiskReason, number> = {
  low_attendance: 40,
  academic_risk: 35,
  overdue_fees: 25,
};

export const INSIGHT_AREA_CONFIG: Record<InsightArea, { label: string }> = {
  attendance: { label: "Attendance" },
  academics: { label: "Academics" },
  fees: { label: "Fees" },
  admissions: { label: "Admissions" },
};

export const DRAFT_SCENARIO_CONFIG: Record<DraftScenario, { label: string; description: string }> = {
  report_card_comment: { label: "Report card comment", description: "A short performance summary based on the student's real exam history." },
  fee_reminder: { label: "Fee reminder", description: "A payment reminder for a student's real overdue invoice, if one exists." },
  attendance_concern: { label: "Attendance concern note", description: "A note to guardians when a student's real attendance has dropped." },
  positive_recognition: { label: "Positive recognition note", description: "A congratulatory note based on the student's strongest real metric." },
};

export const DRAFT_SCENARIO_OPTIONS: Array<{ value: DraftScenario; label: string }> = (Object.keys(DRAFT_SCENARIO_CONFIG) as DraftScenario[]).map((value) => ({
  value,
  label: DRAFT_SCENARIO_CONFIG[value].label,
}));

export function pickPhrase(seed: number, phrases: string[]): string {
  return phrases[Math.abs(seed) % phrases.length];
}
