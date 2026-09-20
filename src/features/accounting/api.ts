import { mockDelay } from "@/utils/mockDelay";
import { DEFAULT_TENANT_ID, getCurrentTenantId, migrateLegacyRecordsToDefaultTenant, scopedToCurrentTenant } from "@/utils/tenant";
import { DEBIT_NORMAL_TYPES } from "./constants";
import { buildSeedJournalEntries, SEED_ACCOUNTS } from "./mock";
import type {
  Account,
  AccountFormValues,
  GstSummary,
  JournalEntry,
  JournalEntryFormValues,
  ProfitAndLoss,
  TrialBalance,
} from "./types";

const ACCOUNTS_KEY = "sms-mock-accounting-accounts";
const ENTRIES_KEY = "sms-mock-accounting-entries";
const SEEDED_KEY = "sms-mock-accounting-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let accounts = migrateLegacyRecordsToDefaultTenant(loadJson<Account[]>(ACCOUNTS_KEY, []));
let entries = migrateLegacyRecordsToDefaultTenant(loadJson<JournalEntry[]>(ENTRIES_KEY, []));

const persistAccounts = () => saveJson(ACCOUNTS_KEY, accounts);
const persistEntries = () => saveJson(ENTRIES_KEY, entries);

function requireEntity<T extends { id: string; tenantId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (accounts.length === 0) {
    accounts = SEED_ACCOUNTS.map((a) => ({ ...a, tenantId: DEFAULT_TENANT_ID }));
    persistAccounts();
  }
  if (entries.length === 0) {
    entries = buildSeedJournalEntries().map((e) => ({ ...e, tenantId: DEFAULT_TENANT_ID }));
    persistEntries();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed accounting mock data", err);
});

function nextEntryNumber(): string {
  const year = new Date().getFullYear();
  const max = scopedToCurrentTenant(entries).reduce((acc, e) => {
    const match = e.entryNumber.match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `JE-${year}-${String(max + 1).padStart(4, "0")}`;
}

function validateBalanced(values: JournalEntryFormValues) {
  if (values.lines.length < 2) throw new Error("A journal entry needs at least two lines");
  for (const l of values.lines) {
    if (l.debit > 0 && l.credit > 0) throw new Error("A line can't have both a debit and a credit amount");
    if (l.debit === 0 && l.credit === 0) throw new Error("Every line needs a debit or a credit amount");
  }
  const totalDebit = values.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = values.lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.round(totalDebit) !== Math.round(totalCredit)) {
    throw new Error(`Entry is not balanced: debit ${totalDebit} does not equal credit ${totalCredit}`);
  }
}

// ── Chart of accounts ────────────────────────────────────────────────────

export async function listAccounts(): Promise<Account[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(accounts), 300);
}

export async function createAccount(values: AccountFormValues): Promise<Account> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  if (accounts.some((a) => a.tenantId === tenantId && a.code.trim() === values.code.trim())) {
    await mockDelay(null, 300);
    throw new Error("An account with this code already exists");
  }
  const account: Account = { id: genId("acc"), tenantId, ...values };
  accounts = [...accounts, account].sort((a, b) => a.code.localeCompare(b.code));
  persistAccounts();
  return mockDelay(account, 350);
}

export async function updateAccount(id: string, values: AccountFormValues): Promise<Account> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  requireEntity(accounts, id, "Account");
  if (accounts.some((a) => a.tenantId === tenantId && a.id !== id && a.code.trim() === values.code.trim())) {
    await mockDelay(null, 300);
    throw new Error("An account with this code already exists");
  }
  accounts = accounts.map((a) => (a.id === id ? { ...a, ...values } : a)).sort((a, b) => a.code.localeCompare(b.code));
  persistAccounts();
  return mockDelay(requireEntity(accounts, id, "Account"), 350);
}

export async function deleteAccount(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  requireEntity(accounts, id, "Account");
  const inUse = entries.some((e) => e.tenantId === tenantId && e.lines.some((l) => l.accountId === id));
  if (inUse) {
    await mockDelay(null, 300);
    throw new Error("This account has journal entries posted against it and can't be deleted");
  }
  accounts = accounts.filter((a) => !(a.id === id && a.tenantId === tenantId));
  persistAccounts();
  return mockDelay(undefined, 350);
}

// ── Journal entries ──────────────────────────────────────────────────────

export async function listJournalEntries(): Promise<JournalEntry[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenant(entries).sort((a, b) => b.date.localeCompare(a.date)), 350);
}

export async function getJournalEntry(id: string): Promise<JournalEntry> {
  await seedPromise;
  return mockDelay(requireEntity(entries, id, "Journal entry"), 300);
}

export async function createJournalEntry(values: JournalEntryFormValues): Promise<JournalEntry> {
  await seedPromise;
  validateBalanced(values);
  const entry: JournalEntry = {
    id: genId("je"),
    tenantId: getCurrentTenantId(),
    entryNumber: nextEntryNumber(),
    date: values.date,
    reference: values.reference?.trim() || undefined,
    narration: values.narration.trim(),
    status: "draft",
    gstApplicable: values.gstApplicable,
    gstAmount: values.gstApplicable ? values.gstAmount : undefined,
    lines: values.lines.map((l) => ({ id: genId("ln"), ...l, description: l.description?.trim() || undefined })),
    createdAt: new Date().toISOString(),
  };
  entries = [entry, ...entries];
  persistEntries();
  return mockDelay(entry, 450);
}

export async function updateJournalEntry(id: string, values: JournalEntryFormValues): Promise<JournalEntry> {
  await seedPromise;
  const existing = requireEntity(entries, id, "Journal entry");
  if (existing.status === "posted") {
    await mockDelay(null, 300);
    throw new Error("Posted entries can't be edited — delete it and create a correcting entry instead");
  }
  validateBalanced(values);
  const updated: JournalEntry = {
    ...existing,
    date: values.date,
    reference: values.reference?.trim() || undefined,
    narration: values.narration.trim(),
    gstApplicable: values.gstApplicable,
    gstAmount: values.gstApplicable ? values.gstAmount : undefined,
    lines: values.lines.map((l) => ({ id: genId("ln"), ...l, description: l.description?.trim() || undefined })),
  };
  entries = entries.map((e) => (e.id === id ? updated : e));
  persistEntries();
  return mockDelay(updated, 450);
}

export async function postJournalEntry(id: string): Promise<JournalEntry> {
  await seedPromise;
  const existing = requireEntity(entries, id, "Journal entry");
  if (existing.status === "posted") {
    await mockDelay(null, 300);
    throw new Error("This entry is already posted");
  }
  const updated: JournalEntry = { ...existing, status: "posted" };
  entries = entries.map((e) => (e.id === id ? updated : e));
  persistEntries();
  return mockDelay(updated, 400);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await seedPromise;
  requireEntity(entries, id, "Journal entry");
  entries = entries.filter((e) => e.id !== id);
  persistEntries();
  return mockDelay(undefined, 350);
}

// ── Reports ──────────────────────────────────────────────────────────────

export async function getTrialBalance(): Promise<TrialBalance> {
  await seedPromise;
  const accountById = new Map(scopedToCurrentTenant(accounts).map((a) => [a.id, a] as const));
  const totals = new Map<string, { debit: number; credit: number }>();

  for (const entry of scopedToCurrentTenant(entries)) {
    if (entry.status !== "posted") continue;
    for (const l of entry.lines) {
      const bucket = totals.get(l.accountId) ?? { debit: 0, credit: 0 };
      bucket.debit += l.debit;
      bucket.credit += l.credit;
      totals.set(l.accountId, bucket);
    }
  }

  const rows = Array.from(totals.entries())
    .map(([accountId, { debit, credit }]) => {
      const account = accountById.get(accountId);
      return {
        accountId,
        accountCode: account?.code ?? "—",
        accountName: account?.name ?? "Unknown account",
        type: account?.type ?? "asset",
        totalDebit: debit,
        totalCredit: credit,
      };
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalDebit = rows.reduce((sum, r) => sum + r.totalDebit, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.totalCredit, 0);

  return mockDelay({ rows, totalDebit, totalCredit }, 400);
}

export async function getProfitAndLoss(): Promise<ProfitAndLoss> {
  await seedPromise;
  const accountById = new Map(scopedToCurrentTenant(accounts).map((a) => [a.id, a] as const));
  const netByAccount = new Map<string, number>();

  for (const entry of scopedToCurrentTenant(entries)) {
    if (entry.status !== "posted") continue;
    for (const l of entry.lines) {
      const account = accountById.get(l.accountId);
      if (!account || (account.type !== "income" && account.type !== "expense")) continue;
      const isDebitNormal = DEBIT_NORMAL_TYPES.has(account.type);
      const delta = isDebitNormal ? l.debit - l.credit : l.credit - l.debit;
      netByAccount.set(l.accountId, (netByAccount.get(l.accountId) ?? 0) + delta);
    }
  }

  const income = Array.from(netByAccount.entries())
    .filter(([accountId]) => accountById.get(accountId)?.type === "income")
    .map(([accountId, amount]) => ({ accountId, accountName: accountById.get(accountId)?.name ?? "Unknown", amount }))
    .sort((a, b) => b.amount - a.amount);

  const expenses = Array.from(netByAccount.entries())
    .filter(([accountId]) => accountById.get(accountId)?.type === "expense")
    .map(([accountId, amount]) => ({ accountId, accountName: accountById.get(accountId)?.name ?? "Unknown", amount }))
    .sort((a, b) => b.amount - a.amount);

  const incomeTotal = income.reduce((sum, r) => sum + r.amount, 0);
  const expenseTotal = expenses.reduce((sum, r) => sum + r.amount, 0);

  return mockDelay({ income, expenses, incomeTotal, expenseTotal, netProfit: incomeTotal - expenseTotal }, 400);
}

export async function getGstSummary(): Promise<GstSummary> {
  await seedPromise;
  const accountById = new Map(scopedToCurrentTenant(accounts).map((a) => [a.id, a] as const));
  const gstEntries = scopedToCurrentTenant(entries).filter((e) => e.status === "posted" && e.gstApplicable && e.gstAmount);

  const summaries = gstEntries.map((entry) => {
    const hasIncomeLine = entry.lines.some((l) => accountById.get(l.accountId)?.type === "income");
    const direction: "output" | "input" = hasIncomeLine ? "output" : "input";
    return {
      entryId: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date,
      narration: entry.narration,
      direction,
      taxAmount: entry.gstAmount ?? 0,
    };
  });

  const outputTax = summaries.filter((s) => s.direction === "output").reduce((sum, s) => sum + s.taxAmount, 0);
  const inputTax = summaries.filter((s) => s.direction === "input").reduce((sum, s) => sum + s.taxAmount, 0);

  return mockDelay(
    { outputTax, inputTax, netPayable: outputTax - inputTax, entries: summaries.sort((a, b) => b.date.localeCompare(a.date)) },
    400,
  );
}
