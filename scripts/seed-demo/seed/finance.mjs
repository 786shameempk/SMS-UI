// FinanceService: fees and accounting per branch, payroll once per tenant (one run covers every branch).
import { addDays, iso, pool } from "../lib.mjs";

export async function seedFinance(ctx) {
  const { s, r, S, today, y0 } = ctx;

  await S("Fee Management", "fee structures", async () => {
    ctx.fees = [];
    for (const c of ctx.classes) {
      ctx.fees.push({ classId: c.id, ...(await s.post("finance", "/api/feestructures", { name: `Tuition - Grade ${c.grade}`, academicYearId: ctx.year.id, classId: c.id, feeType: "Tuition", amount: 12000 + c.grade * 1500, frequency: "TermWise", lateFineFlat: 200, lateFinePerDay: 10 })) });
    }
    ctx.busFee = await s.post("finance", "/api/feestructures", { name: "Bus fee", academicYearId: ctx.year.id, classId: null, feeType: "Bus", amount: 3500, frequency: "TermWise", lateFineFlat: null, lateFinePerDay: null });
    await s.post("finance", "/api/feestructures", { name: "Examination fee", academicYearId: ctx.year.id, classId: null, feeType: "Exam", amount: 800, frequency: "Annual", lateFineFlat: null, lateFinePerDay: null });
    return `${ctx.fees.length + 2} structures`;
  });

  await S("Fee Management", "fee invoices, payments & discounts", async () => {
    for (const f of ctx.fees ?? []) {
      await s.post("finance", "/api/feeinvoices/generate", { feeStructureId: f.id, term: "Term 1", dueDate: `${y0}-07-15`, eligibleStudentIds: ctx.studentsIn(f.classId).map((x) => x.id) });
    }
    const invoices = (await s.get("finance", "/api/feeinvoices")) ?? [];
    let paid = 0, partial = 0;
    // One at a time: FinanceService numbers receipts as count+1, so parallel payments collide (see README "Known issues").
    await pool(invoices, 1, async (inv) => {
      const amount = Number(inv.netAmount ?? inv.amount ?? 0);
      const x = r.next();
      if (!amount || inv.status === "Paid") return;
      if (x < 0.6) {
        await s.post("finance", `/api/feeinvoices/${inv.id}/payments`, { amount, mode: r.pick(["Online", "Cash", "Card", "Cheque", "Online"]) });
        paid++;
      } else if (x < 0.75) {
        await s.post("finance", `/api/feeinvoices/${inv.id}/payments`, { amount: Math.round(amount / 2), mode: "Cash" });
        partial++;
      } else if (x < 0.8) {
        await s.post("finance", `/api/feeinvoices/${inv.id}/installments`, { count: 3 });
      }
    });
    await s.post("finance", "/api/feediscounts", { name: "Sibling discount", type: "Percentage", value: 10, appliesTo: "Specific", studentIds: r.shuffle(ctx.students).slice(0, 5).map((x) => x.id), description: "10% off tuition for siblings" });
    await s.post("finance", "/api/feediscounts", { name: "Staff ward concession", type: "Flat", value: 2500, appliesTo: "Specific", studentIds: r.shuffle(ctx.students).slice(0, 2).map((x) => x.id), description: null });
    const paidInvoice = invoices[0];
    if (paidInvoice && paid) await s.post("finance", "/api/refunds", { feeInvoiceId: paidInvoice.id, amount: 500, reason: "Excess amount paid" }).catch(() => {});
    return `${invoices.length} invoices, ${paid} paid, ${partial} part-paid`;
  });

  await S("Accounting", "accounting journal", async () => {
    const accounts = (await s.get("finance", "/api/accounts")) ?? [];
    const need = [
      ["1000", "Cash in hand", "Asset"],
      ["1100", "Bank - current account", "Asset"],
      ["4000", "Tuition fee income", "Income"],
      ["5000", "Electricity & utilities", "Expense"],
      ["5100", "Stationery & supplies", "Expense"],
    ];
    for (const [code, name, type] of need) if (!accounts.some((a) => a.code === code)) accounts.push(await s.post("finance", "/api/accounts", { code, name, type, description: null }));
    const acc = (code) => accounts.find((a) => a.code === code).id;
    const entries = [
      ["Electricity bill - last month", "5000", "1100", r.int(12, 25) * 1000 + 450],
      ["Stationery purchase", "5100", "1000", r.int(4, 9) * 1000 + 200],
      ["Fee deposit to bank", "1100", "1000", r.int(60, 140) * 1000],
    ];
    for (const [narration, dr, cr, amt] of entries) {
      const je = await s.post("finance", "/api/journalentries", { date: iso(addDays(today, -r.int(1, 20))), reference: `JV-${r.int(1000, 9999)}`, narration, gstApplicable: false, gstAmount: null, lines: [{ accountId: acc(dr), debit: amt, credit: 0, description: null }, { accountId: acc(cr), debit: 0, credit: amt, description: null }] });
      await s.post("finance", `/api/journalentries/${je.id}/post`);
    }
    return `${entries.length} posted entries`;
  });
}

/** One payroll run for last month covering every branch of the tenant; 70% of payslips marked paid. */
export async function seedPayroll(tctx) {
  const { s, S, bulk, today, allStaff, firstBranchId } = tctx;
  await S("Payroll", "payroll for last month", async () => {
    const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const month = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`;
    s.branch = firstBranchId;
    const eligible = allStaff.filter((m) => m.basic);
    if (!eligible.length) return "no salaried staff";
    const result = await s.post("finance", "/api/payrollruns/generate", { month, eligibleStaff: eligible.map((m) => ({ staffId: m.id, basic: m.basic, allowances: m.allowances, deductions: m.deductions })) });
    const runId = result.run?.id ?? result.id;
    await s.post("finance", `/api/payrollruns/${runId}/finalize`);
    const slips = (await s.get("finance", `/api/payslips?runId=${runId}`)) ?? [];
    await bulk(slips.slice(0, Math.ceil(slips.length * 0.7)), (p) => s.post("finance", `/api/payslips/${p.id}/mark-paid`));
    return `${month}: ${slips.length} payslips, ${Math.ceil(slips.length * 0.7)} paid`;
  });
}
