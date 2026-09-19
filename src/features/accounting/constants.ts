import type { AccountType, JournalEntryStatus } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; variant: BadgeVariant }> = {
  asset: { label: "Asset", variant: "info" },
  liability: { label: "Liability", variant: "warning" },
  equity: { label: "Equity", variant: "neutral" },
  income: { label: "Income", variant: "success" },
  expense: { label: "Expense", variant: "danger" },
};

export const JOURNAL_STATUS_CONFIG: Record<JournalEntryStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "neutral" },
  posted: { label: "Posted", variant: "success" },
};

/** Debit-normal account types increase with a debit; credit-normal types increase with a credit. */
export const DEBIT_NORMAL_TYPES: ReadonlySet<AccountType> = new Set(["asset", "expense"]);
