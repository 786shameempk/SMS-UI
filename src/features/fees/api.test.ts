import * as fees from "./api";
import { financeHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [
    { id: "s1", status: "active", className: "Class 5" },
    { id: "s2", status: "active", className: "Class 6" },
    { id: "s3", status: "inactive", className: "Class 5" },
  ]),
}));
vi.mock("@/features/academics/api", () => ({
  listClasses: vi.fn(async () => [{ id: "c5", name: "Class 5" }]),
}));

const structure = { id: "fs1", tenantId: "t", branchId: "b", name: "Tuition T1", academicYearId: "y1", classId: "c5", feeType: "Tuition", amount: 12000, frequency: "TermWise", lateFineFlat: null, lateFinePerDay: 10 };
const invoice = (overrides: Record<string, unknown> = {}) => ({
  id: "i1", tenantId: "t", branchId: "b", studentId: "s1", feeStructureId: "fs1", feeType: "Bus", term: "Term 1", amount: 12000,
  discountId: null, discountAmount: 0, fineAmount: 0, netAmount: 12000, dueDate: "2026-10-10", status: "Partial",
  installments: [{ id: "in1", dueDate: "2026-10-10", amount: 6000, status: "Paid" }], paidOn: null, paidAmount: 5000, ...overrides,
});
const receipt = { id: "r1", tenantId: "t", branchId: "b", feeInvoiceId: "i1", receiptNumber: "RCPT-1", amount: 5000, paidOn: "2026-09-01", paymentMode: "Cheque", providerPaymentId: null };
const values = { name: "Tuition T1", academicYearId: "y1", classId: undefined, feeType: "hostel", amount: 9000, frequency: "monthly", lateFineFlat: 100, lateFinePerDay: undefined };

describe("fees api", () => {
  it("translates fee structures to and from FinanceService enums", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/feestructures": [structure, { ...structure, id: "fs2", feeType: "Unknown", frequency: "Weird", classId: null, lateFinePerDay: null }],
      "POST /api/feestructures": structure,
      "PUT /api/feestructures/fs1": structure,
      "DELETE /api/feestructures/fs1": null,
    });

    const [mapped, fallback] = await fees.listFeeStructures();
    await fees.createFeeStructure(values as never);
    await fees.updateFeeStructure("fs1", values as never);
    await fees.deleteFeeStructure("fs1");

    expect(mapped).toMatchObject({ feeType: "tuition", frequency: "term_wise", classId: "c5", lateFineFlat: undefined, lateFinePerDay: 10 });
    expect(fallback).toMatchObject({ feeType: "tuition", frequency: "term_wise", classId: undefined });
    expect(calls[1].body).toEqual({ name: "Tuition T1", academicYearId: "y1", classId: null, feeType: "Hostel", amount: 9000, frequency: "Monthly", lateFineFlat: 100, lateFinePerDay: null });
  });

  it("discounts trim descriptions and map types", async () => {
    const dto = { id: "d1", tenantId: "t", branchId: "b", name: "Sibling", type: "Percentage", value: 10, appliesTo: "Specific", studentIds: ["s1"], description: null };
    const calls = stubClient(financeHttpClient, {
      "GET /api/feediscounts": [dto],
      "POST /api/feediscounts": dto,
      "PUT /api/feediscounts/d1": dto,
      "DELETE /api/feediscounts/d1": null,
    });
    const form = { name: "Sibling", type: "flat", value: 500, appliesTo: "all", studentIds: [], description: "  " };

    expect((await fees.listDiscounts())[0]).toMatchObject({ type: "percentage", appliesTo: "specific", description: undefined });
    await fees.createDiscount(form as never);
    await fees.updateDiscount("d1", { ...form, description: " For siblings " } as never);
    await fees.deleteDiscount("d1");

    expect(calls[1].body).toMatchObject({ type: "Flat", appliesTo: "All", description: null });
    expect(calls[2].body).toMatchObject({ description: "For siblings" });
    await expect(fees.applyDiscountToInvoice("i1", "d1")).rejects.toThrow(/isn't supported yet/);
  });

  it("maps invoices, installments and paging with server-side filters", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/feeinvoices": (_url: string, _body: unknown, config: { params?: Record<string, unknown> }) =>
        config?.params?.pageNumber ? { items: [invoice()], totalCount: 31 } : [invoice(), invoice({ id: "i2", installments: [], status: "Paid", paidOn: "2026-09-01" })],
    });

    const all = await fees.listInvoices();
    const page = await fees.listInvoicesPage({ pageIndex: 2, pageSize: 10, classId: "c5", status: "overdue" });
    await fees.listInvoicesForStudent("s1");

    expect(all[0]).toMatchObject({ feeType: "bus", status: "partial", installments: [{ status: "paid" }], discountId: undefined });
    expect(all[1]).toMatchObject({ status: "paid", installments: undefined, paidOn: "2026-09-01" });
    expect(page.totalCount).toBe(31);
    expect((calls[1].config as { params: unknown }).params).toEqual({ pageNumber: 3, pageSize: 10, classId: "c5", status: "Overdue" });
    expect((calls[2].config as { params: unknown }).params).toEqual({ studentId: "s1" });
    expect((await fees.getInvoice("i2")).status).toBe("paid");
    await expect(fees.getInvoice("missing")).rejects.toThrow("Invoice not found");
  });

  it("generates invoices for the structure's class's active students only", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/feestructures": [structure, { ...structure, id: "school-wide", classId: null }, { ...structure, id: "gone-class", classId: "c9" }],
      "POST /api/feeinvoices/generate": { createdCount: 1, skippedCount: 0 },
    });

    expect(await fees.generateInvoicesForStructure({ feeStructureId: "fs1", academicYearId: "ay1", term: "T1", dueDate: "2026-10-10" })).toEqual({ createdCount: 1, skippedCount: 0 });
    await fees.generateInvoicesForStructure({ feeStructureId: "school-wide", academicYearId: "ay1", term: "T1", dueDate: "2026-10-10" });
    await fees.generateInvoicesForStructure({ feeStructureId: "gone-class", academicYearId: "ay1", term: "T1", dueDate: "2026-10-10" });

    const sent = calls.filter((c) => c.method === "POST").map((c) => (c.body as { eligibleStudentIds: string[] }).eligibleStudentIds);
    expect(sent).toEqual([["s1"], ["s1", "s2"], []]);
    await expect(fees.generateInvoicesForStructure({ feeStructureId: "nope", academicYearId: "ay1", term: "T1", dueDate: "" })).rejects.toThrow("Fee structure not found");
  });

  it("records payments, installments and pays the remaining balance online", async () => {
    const calls = stubClient(financeHttpClient, {
      "POST /api/feeinvoices/i1/installments": invoice(),
      "POST /api/feeinvoices/i1/payments": { invoice: invoice({ status: "Paid" }), receipt },
      "GET /api/feeinvoices": [invoice()],
    });

    await fees.generateInstallments("i1", 3);
    const paid = await fees.recordPayment("i1", { amount: 100, mode: "card" });
    await fees.payInvoiceOnline("i1");

    expect(paid.receipt).toMatchObject({ invoiceId: "i1", paymentMode: "cheque", providerPaymentId: undefined });
    expect(calls[0].body).toEqual({ count: 3 });
    expect(calls[1].body).toEqual({ amount: 100, mode: "Card" });
    expect(calls.at(-1)?.body).toEqual({ amount: 7000, mode: "Online" });
  });

  it("receipts and refunds", async () => {
    const refund = { id: "rf1", tenantId: "t", branchId: "b", feeInvoiceId: "i1", amount: 500, reason: "Duplicate", refundedOn: "2026-09-02", status: "Processed" };
    const calls = stubClient(financeHttpClient, {
      "GET /api/receipts": [receipt],
      "GET /api/refunds": [refund, { ...refund, status: "Odd" }],
      "POST /api/refunds": refund,
      "POST /api/refunds/rf1/process": refund,
    });

    expect((await fees.getReceipt("r1")).receiptNumber).toBe("RCPT-1");
    await expect(fees.getReceipt("x")).rejects.toThrow("Receipt not found");
    expect((await fees.listRefunds()).map((r) => r.status)).toEqual(["processed", "pending"]);
    await fees.requestRefund({ invoiceId: "i1", amount: 500, reason: "Duplicate" });
    await fees.processRefund("rf1");
    expect(calls.find((c) => c.url === "/api/refunds" && c.method === "POST")?.body).toEqual({ feeInvoiceId: "i1", amount: 500, reason: "Duplicate" });
  });

  it("online payment with Razorpay", async () => {
    const calls = stubClient(financeHttpClient, {
      "GET /api/payments/config": { enabled: true, keyId: "rzp_test", currency: "INR" },
      "POST /api/payments/razorpay/orders": { orderId: "order_1", keyId: "rzp_test", amountPaise: 700000, currency: "INR", invoiceId: "i1", description: "" },
      "POST /api/payments/razorpay/verify": { status: "Paid", invoice: invoice({ status: "Paid" }), receipt: null },
    });

    expect((await fees.getPaymentConfig()).enabled).toBe(true);
    expect((await fees.createRazorpayOrder("i1")).orderId).toBe("order_1");
    const verified = await fees.verifyRazorpayPayment({ orderId: "order_1", paymentId: "pay_1", signature: "sig" });

    expect([verified.invoice.status, verified.receipt]).toEqual(["paid", null]);
    expect(calls[1].body).toEqual({ invoiceId: "i1" });
  });

  it("wraps failures in a readable error", async () => {
    vi.spyOn(financeHttpClient, "get").mockRejectedValue(apiError(400, { title: "x", errors: { amount: ["Amount must be positive"] } }));
    await expect(fees.listInvoices()).rejects.toThrow("Amount must be positive");
  });
});
