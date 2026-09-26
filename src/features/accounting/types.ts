export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string;
}

export interface AccountFormValues {
  code: string;
  name: string;
  type: AccountType;
  description?: string;
}

export type JournalEntryStatus = "draft" | "posted";

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  entryNumber: string;
  date: string;
  reference?: string;
  narration: string;
  status: JournalEntryStatus;
  gstApplicable: boolean;
  gstAmount?: number;
  lines: JournalLine[];
  createdAt: string;
}

export interface JournalLineFormValues {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryFormValues {
  date: string;
  reference?: string;
  narration: string;
  gstApplicable: boolean;
  gstAmount?: number;
  lines: JournalLineFormValues[];
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  type: AccountType;
  totalDebit: number;
  totalCredit: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export interface ProfitAndLossLine {
  accountId: string;
  accountName: string;
  amount: number;
}

export interface ProfitAndLoss {
  income: ProfitAndLossLine[];
  expenses: ProfitAndLossLine[];
  incomeTotal: number;
  expenseTotal: number;
  netProfit: number;
}

export interface GstEntrySummary {
  entryId: string;
  entryNumber: string;
  date: string;
  narration: string;
  direction: "output" | "input";
  taxAmount: number;
}

export interface GstSummary {
  outputTax: number;
  inputTax: number;
  netPayable: number;
  entries: GstEntrySummary[];
}
