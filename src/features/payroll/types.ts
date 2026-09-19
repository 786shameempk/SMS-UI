import type { StaffMember } from "@/features/staff/types";

export type PayrollRunStatus = "draft" | "finalized";

export interface PayrollRun {
  id: string;
  month: string;
  status: PayrollRunStatus;
  generatedAt: string;
  finalizedAt?: string;
}

export interface PayrollRunSummary extends PayrollRun {
  staffCount: number;
  totalNetPay: number;
  paidCount: number;
}

export interface Payslip {
  id: string;
  runId: string;
  staffId: string;
  month: string;
  basic: number;
  allowances: number;
  deductions: number;
  netPay: number;
  paid: boolean;
  paidOn?: string;
}

export interface PayslipRow extends Payslip {
  staff: StaffMember;
}

export interface GeneratePayrollResult {
  run: PayrollRun;
  createdCount: number;
  skippedCount: number;
}
