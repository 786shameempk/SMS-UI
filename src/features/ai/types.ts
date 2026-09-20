import type { Student } from "@/features/students/types";

export type InsightArea = "attendance" | "academics" | "fees" | "admissions";

export interface Insight {
  area: InsightArea;
  headline: string;
  bullets: string[];
}

export type RiskReason = "low_attendance" | "academic_risk" | "overdue_fees";

export interface RiskFlag {
  reason: RiskReason;
  detail: string;
}

export interface AtRiskStudent {
  student: Student;
  riskScore: number;
  flags: RiskFlag[];
}

export interface DismissedFlag {
  id: string;
  tenantId: string;
  branchId: string;
  studentId: string;
  dismissedAt: string;
}

export type DraftScenario = "report_card_comment" | "fee_reminder" | "attendance_concern" | "positive_recognition";

export interface DraftRequest {
  scenario: DraftScenario;
  studentId: string;
}

export interface GeneratedDraft {
  scenario: DraftScenario;
  subject?: string;
  body: string;
  /** Set when the requested scenario doesn't apply to this student right now (e.g. no overdue fees) instead of fabricating a draft that doesn't fit the real data. */
  notApplicableReason?: string;
}
