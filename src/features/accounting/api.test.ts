import * as acc from "./api";
import { financeHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const account = (overrides: Record<string, unknown> = {}) => ({ id: "a1", tenantId: "t", code: "1000", name: "Cash", type: "Asset", description: null, ...overrides });
const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "j1", tenantId: "t", entryNumber: "JV-1", date: "2026-09-01", reference: null, narration: "Fees", status: "Posted", gstApplicable: false, gstAmount: null,
  lines: [{ id: "l1", accountId: "a1", debit: 100, credit: 0, description: null }], createdAt: "", ...overrides,
});

describe("accounting api", () => {
  it("maps accounts and sends the API enum on save", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/accounts": [account(), account({ id: "a2", type: "Expense", description: "Rent" }), account({ id: "a3", type: "Mystery" })],
      "POST /api/accounts": account({ type: "Income" }),
      "PUT /api/accounts/a1": account({ type: "Liability" }),
      "DELETE /api/accounts/a1": null,
    });

    const rows = await acc.listAccounts();
    const created = await acc.createAccount({ code: "4000", name: "Fees", type: "income", description: "  " });
    const updated = await acc.updateAccount("a1", { code: "2000", name: "Payables", type: "liability", description: " AP " });
    await acc.deleteAccount("a1");

    expect(rows.map((a) => [a.type, a.description])).toEqual([["asset", undefined], ["expense", "Rent"], ["asset", undefined]]);
    expect(created.type).toBe("income");
    expect(updated.type).toBe("liability");
    expect(calls[1].body).toEqual({ code: "4000", name: "Fees", type: "Income", description: null });
    expect(calls[2].body).toEqual({ code: "2000", name: "Payables", type: "Liability", description: "AP" });
    expect(calls[3]).toMatchObject({ method: "DELETE", url: "/api/accounts/a1" });
  });

  it("journal entries: list, read, create, update, post, delete", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/journalentries": [entry(), entry({ id: "j2", status: "Draft", reference: "R1", gstApplicable: true, gstAmount: 18 })],
      "GET /api/journalentries/j1": entry(),
      "POST /api/journalentries": entry({ status: "Draft" }),
      "PUT /api/journalentries/j1": entry({ status: "Unknown" }),
      "POST /api/journalentries/j1/post": entry(),
      "DELETE /api/journalentries/j1": null,
    });
    const values = {
      date: "2026-09-01", reference: " ", narration: " Fees ", gstApplicable: false, gstAmount: 18,
      lines: [{ accountId: "a1", debit: 100, credit: 0, description: " cash " }, { accountId: "a2", debit: 0, credit: 100 }],
    };

    const rows = await acc.listJournalEntries();
    expect((await acc.getJournalEntry("j1")).lines[0].description).toBeUndefined();
    expect((await acc.createJournalEntry(values as never)).status).toBe("draft");
    expect((await acc.updateJournalEntry("j1", { ...values, gstApplicable: true, reference: "R9" } as never)).status).toBe("draft");
    expect((await acc.postJournalEntry("j1")).status).toBe("posted");
    await acc.deleteJournalEntry("j1");

    expect(rows.map((r) => [r.status, r.reference, r.gstAmount])).toEqual([["posted", undefined, undefined], ["draft", "R1", 18]]);
    expect(calls[2].body).toEqual({
      date: "2026-09-01", reference: null, narration: "Fees", gstApplicable: false, gstAmount: null,
      lines: [{ accountId: "a1", debit: 100, credit: 0, description: "cash" }, { accountId: "a2", debit: 0, credit: 100, description: null }],
    });
    expect(calls[3].body).toMatchObject({ reference: "R9", gstApplicable: true, gstAmount: 18 });
  });

  it("maps the trial balance, P&L and GST summary reports", async () => {
    stubClient(financeHttpClient, {
      "GET /api/journalentries/reports/trial-balance": {
        rows: [
          { accountId: "a1", accountCode: "1000", accountName: "Cash", type: "Equity", totalDebit: 5, totalCredit: 0 },
          { accountId: "a9", accountCode: "9", accountName: "X", type: "?", totalDebit: 0, totalCredit: 5 },
        ],
        totalDebit: 5, totalCredit: 5,
      },
      "GET /api/journalentries/reports/profit-and-loss": {
        income: [{ accountId: "a4", accountName: "Fees", amount: 900 }], expenses: [{ accountId: "a5", accountName: "Rent", amount: 400 }],
        incomeTotal: 900, expenseTotal: 400, netProfit: 500,
      },
      "GET /api/journalentries/reports/gst-summary": {
        outputTax: 18, inputTax: 5, netPayable: 13,
        entries: [
          { entryId: "j1", entryNumber: "JV-1", date: "", narration: "n", direction: "Input", taxAmount: 5 },
          { entryId: "j2", entryNumber: "JV-2", date: "", narration: "n", direction: "?", taxAmount: 18 },
        ],
      },
    });

    const tb = await acc.getTrialBalance();
    const pl = await acc.getProfitAndLoss();
    const gst = await acc.getGstSummary();

    expect(tb.rows.map((r) => r.type)).toEqual(["equity", "asset"]);
    expect(tb).toMatchObject({ totalDebit: 5, totalCredit: 5 });
    expect(pl).toEqual({
      income: [{ accountId: "a4", accountName: "Fees", amount: 900 }], expenses: [{ accountId: "a5", accountName: "Rent", amount: 400 }],
      incomeTotal: 900, expenseTotal: 400, netProfit: 500,
    });
    expect(gst.entries.map((e) => e.direction)).toEqual(["input", "output"]);
    expect(gst.netPayable).toBe(13);
  });

  it("surfaces the server's error message", async () => {
    vi.spyOn(financeHttpClient, "post").mockRejectedValue(apiError(400, { title: "Debits must equal credits" }));
    await expect(acc.postJournalEntry("j1")).rejects.toThrow("Debits must equal credits");
  });
});
