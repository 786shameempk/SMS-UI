import { financeHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  Account,
  AccountFormValues,
  AccountType,
  GstSummary,
  JournalEntry,
  JournalEntryFormValues,
  JournalEntryStatus,
  JournalLine,
  ProfitAndLoss,
  TrialBalance,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// FinanceService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const ACCOUNT_TYPE_TO_API: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
};
const ACCOUNT_TYPE_FROM_API: Record<string, AccountType> = {
  Asset: "asset",
  Liability: "liability",
  Equity: "equity",
  Income: "income",
  Expense: "expense",
};

const JOURNAL_STATUS_FROM_API: Record<string, JournalEntryStatus> = { Draft: "draft", Posted: "posted" };

const GST_DIRECTION_FROM_API: Record<string, "output" | "input"> = { Output: "output", Input: "input" };

// ── API response shapes (FinanceService DTOs) ───────────────────────────────

interface ApiAccount {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
}

interface ApiJournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
}

interface ApiJournalEntry {
  id: string;
  tenantId: string;
  entryNumber: string;
  date: string;
  reference: string | null;
  narration: string;
  status: string;
  gstApplicable: boolean;
  gstAmount: number | null;
  lines: ApiJournalLine[];
  createdAt: string;
}

interface ApiTrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
}

interface ApiTrialBalance {
  rows: ApiTrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

interface ApiProfitAndLossLine {
  accountId: string;
  accountName: string;
  amount: number;
}

interface ApiProfitAndLoss {
  income: ApiProfitAndLossLine[];
  expenses: ApiProfitAndLossLine[];
  incomeTotal: number;
  expenseTotal: number;
  netProfit: number;
}

interface ApiGstEntrySummary {
  entryId: string;
  entryNumber: string;
  date: string;
  narration: string;
  direction: string;
  taxAmount: number;
}

interface ApiGstSummary {
  outputTax: number;
  inputTax: number;
  netPayable: number;
  entries: ApiGstEntrySummary[];
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapAccount(dto: ApiAccount): Account {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    code: dto.code,
    name: dto.name,
    type: ACCOUNT_TYPE_FROM_API[dto.type] ?? "asset",
    description: dto.description ?? undefined,
  };
}

function mapJournalLine(dto: ApiJournalLine): JournalLine {
  return { id: dto.id, accountId: dto.accountId, debit: dto.debit, credit: dto.credit, description: dto.description ?? undefined };
}

function mapJournalEntry(dto: ApiJournalEntry): JournalEntry {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    entryNumber: dto.entryNumber,
    date: dto.date,
    reference: dto.reference ?? undefined,
    narration: dto.narration,
    status: JOURNAL_STATUS_FROM_API[dto.status] ?? "draft",
    gstApplicable: dto.gstApplicable,
    gstAmount: dto.gstAmount ?? undefined,
    lines: dto.lines.map(mapJournalLine),
    createdAt: dto.createdAt,
  };
}

function mapTrialBalance(dto: ApiTrialBalance): TrialBalance {
  return {
    rows: dto.rows.map((r) => ({
      accountId: r.accountId,
      accountCode: r.accountCode,
      accountName: r.accountName,
      type: ACCOUNT_TYPE_FROM_API[r.type] ?? "asset",
      totalDebit: r.totalDebit,
      totalCredit: r.totalCredit,
    })),
    totalDebit: dto.totalDebit,
    totalCredit: dto.totalCredit,
  };
}

function mapProfitAndLoss(dto: ApiProfitAndLoss): ProfitAndLoss {
  return {
    income: dto.income.map((l) => ({ accountId: l.accountId, accountName: l.accountName, amount: l.amount })),
    expenses: dto.expenses.map((l) => ({ accountId: l.accountId, accountName: l.accountName, amount: l.amount })),
    incomeTotal: dto.incomeTotal,
    expenseTotal: dto.expenseTotal,
    netProfit: dto.netProfit,
  };
}

function mapGstSummary(dto: ApiGstSummary): GstSummary {
  return {
    outputTax: dto.outputTax,
    inputTax: dto.inputTax,
    netPayable: dto.netPayable,
    entries: dto.entries.map((e) => ({
      entryId: e.entryId,
      entryNumber: e.entryNumber,
      date: e.date,
      narration: e.narration,
      direction: GST_DIRECTION_FROM_API[e.direction] ?? "output",
      taxAmount: e.taxAmount,
    })),
  };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Chart of accounts ────────────────────────────────────────────────────

export async function listAccounts(): Promise<Account[]> {
  const accounts = await unwrap(financeHttpClient.get<ApiAccount[]>("/api/accounts"));
  return accounts.map(mapAccount);
}

export async function createAccount(values: AccountFormValues): Promise<Account> {
  const dto = await unwrap(
    financeHttpClient.post<ApiAccount>("/api/accounts", {
      code: values.code,
      name: values.name,
      type: ACCOUNT_TYPE_TO_API[values.type],
      description: values.description?.trim() || null,
    }),
  );
  return mapAccount(dto);
}

export async function updateAccount(id: string, values: AccountFormValues): Promise<Account> {
  const dto = await unwrap(
    financeHttpClient.put<ApiAccount>(`/api/accounts/${id}`, {
      code: values.code,
      name: values.name,
      type: ACCOUNT_TYPE_TO_API[values.type],
      description: values.description?.trim() || null,
    }),
  );
  return mapAccount(dto);
}

export async function deleteAccount(id: string): Promise<void> {
  await unwrap(financeHttpClient.delete(`/api/accounts/${id}`));
}

// ── Journal entries ──────────────────────────────────────────────────────

export async function listJournalEntries(): Promise<JournalEntry[]> {
  const entries = await unwrap(financeHttpClient.get<ApiJournalEntry[]>("/api/journalentries"));
  return entries.map(mapJournalEntry);
}

export async function getJournalEntry(id: string): Promise<JournalEntry> {
  const dto = await unwrap(financeHttpClient.get<ApiJournalEntry>(`/api/journalentries/${id}`));
  return mapJournalEntry(dto);
}

export async function createJournalEntry(values: JournalEntryFormValues): Promise<JournalEntry> {
  const dto = await unwrap(
    financeHttpClient.post<ApiJournalEntry>("/api/journalentries", {
      date: values.date,
      reference: values.reference?.trim() || null,
      narration: values.narration.trim(),
      gstApplicable: values.gstApplicable,
      gstAmount: values.gstApplicable ? values.gstAmount ?? null : null,
      lines: values.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description?.trim() || null,
      })),
    }),
  );
  return mapJournalEntry(dto);
}

export async function updateJournalEntry(id: string, values: JournalEntryFormValues): Promise<JournalEntry> {
  const dto = await unwrap(
    financeHttpClient.put<ApiJournalEntry>(`/api/journalentries/${id}`, {
      date: values.date,
      reference: values.reference?.trim() || null,
      narration: values.narration.trim(),
      gstApplicable: values.gstApplicable,
      gstAmount: values.gstApplicable ? values.gstAmount ?? null : null,
      lines: values.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description?.trim() || null,
      })),
    }),
  );
  return mapJournalEntry(dto);
}

export async function postJournalEntry(id: string): Promise<JournalEntry> {
  const dto = await unwrap(financeHttpClient.post<ApiJournalEntry>(`/api/journalentries/${id}/post`));
  return mapJournalEntry(dto);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await unwrap(financeHttpClient.delete(`/api/journalentries/${id}`));
}

// ── Reports ──────────────────────────────────────────────────────────────

export async function getTrialBalance(): Promise<TrialBalance> {
  const dto = await unwrap(financeHttpClient.get<ApiTrialBalance>("/api/journalentries/reports/trial-balance"));
  return mapTrialBalance(dto);
}

export async function getProfitAndLoss(): Promise<ProfitAndLoss> {
  const dto = await unwrap(financeHttpClient.get<ApiProfitAndLoss>("/api/journalentries/reports/profit-and-loss"));
  return mapProfitAndLoss(dto);
}

export async function getGstSummary(): Promise<GstSummary> {
  const dto = await unwrap(financeHttpClient.get<ApiGstSummary>("/api/journalentries/reports/gst-summary"));
  return mapGstSummary(dto);
}
