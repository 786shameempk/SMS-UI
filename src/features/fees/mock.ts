import type { Student } from "@/features/students/types";
import type { FeeDiscount, FeeInvoice, FeeStructure, Receipt, Refund } from "./types";

const CURRENT_ACADEMIC_YEAR_ID = "ay-3";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

const TUITION_CLASS_IDS = [
  "class-1",
  "class-2",
  "class-3",
  "class-4",
  "class-5",
  "class-6",
  "class-7",
  "class-8",
  "class-9",
  "class-10",
];

export const SEED_FEE_STRUCTURES: FeeStructure[] = [
  ...TUITION_CLASS_IDS.map((classId, index) => ({
    id: `fs-tuition-${index + 1}`,
    name: `Grade ${index + 1} Tuition Fee`,
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    classId,
    feeType: "tuition" as const,
    amount: 25000 + index * 1500,
    frequency: "term_wise" as const,
    lateFineFlat: 200,
    lateFinePerDay: 20,
  })),
  {
    id: "fs-bus",
    name: "Bus Fee",
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    feeType: "bus",
    amount: 8000,
    frequency: "annual",
    lateFinePerDay: 15,
  },
  {
    id: "fs-hostel",
    name: "Hostel Fee",
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    feeType: "hostel",
    amount: 45000,
    frequency: "term_wise",
    lateFineFlat: 500,
  },
  {
    id: "fs-library",
    name: "Library Fee",
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    feeType: "library",
    amount: 1500,
    frequency: "annual",
  },
  {
    id: "fs-exam",
    name: "Examination Fee",
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    feeType: "exam",
    amount: 2000,
    frequency: "one_time",
    lateFineFlat: 100,
  },
  {
    id: "fs-misc",
    name: "Miscellaneous Fee",
    academicYearId: CURRENT_ACADEMIC_YEAR_ID,
    feeType: "miscellaneous",
    amount: 1200,
    frequency: "one_time",
  },
];

export const SEED_DISCOUNTS: FeeDiscount[] = [
  {
    id: "disc-merit",
    name: "Merit Scholarship",
    type: "percentage",
    value: 15,
    appliesTo: "specific",
    studentIds: ["stu-1", "stu-3"],
    description: "Awarded for academic excellence.",
  },
  {
    id: "disc-staff-ward",
    name: "Staff Ward Discount",
    type: "flat",
    value: 5000,
    appliesTo: "specific",
    studentIds: ["stu-2"],
    description: "Discount for children of staff members.",
  },
  {
    id: "disc-early-bird",
    name: "Early Bird Discount",
    type: "percentage",
    value: 5,
    appliesTo: "all",
    description: "5% off for early full-year fee payment.",
  },
];

function tuitionStructureFor(student: Student, structures: FeeStructure[]): FeeStructure {
  const match = structures.find((s) => s.feeType === "tuition" && s.classId && TUITION_CLASS_IDS.includes(s.classId));
  const byName = structures.find((s) => s.feeType === "tuition" && s.name.startsWith(student.className));
  return byName ?? match ?? structures.find((s) => s.id === "fs-misc")!;
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function receiptFor(invoice: FeeInvoice, amount: number, paidOn: string, seq: number): Receipt {
  return {
    id: genId("rcpt"),
    invoiceId: invoice.id,
    receiptNumber: `RCPT-2026-${String(seq).padStart(4, "0")}`,
    amount,
    paidOn,
    paymentMode: seq % 2 === 0 ? "online" : "cash",
  };
}

/**
 * Deterministic demo data layered over the real students module: every seeded student gets
 * at least one invoice, and statuses are spread across paid/due/overdue/partial so both the
 * admin Fee Management screens and the parent-portal Fees tab look realistic out of the box.
 */
export function buildSeedFeeData(
  students: Student[],
  structures: FeeStructure[],
  discounts: FeeDiscount[],
): { invoices: FeeInvoice[]; receipts: Receipt[]; refunds: Refund[] } {
  const invoices: FeeInvoice[] = [];
  const receipts: Receipt[] = [];
  const refunds: Refund[] = [];
  let receiptSeq = 1;

  const discountFor = (studentId: string): FeeDiscount | undefined =>
    discounts.find((d) => d.appliesTo === "specific" && d.studentIds.includes(studentId)) ??
    discounts.find((d) => d.appliesTo === "all");

  const applyDiscount = (amount: number, discount?: FeeDiscount): number => {
    if (!discount) return 0;
    const raw = discount.type === "percentage" ? (amount * discount.value) / 100 : discount.value;
    return Math.min(amount, Math.round(raw));
  };

  students.forEach((student, index) => {
    const tuition = tuitionStructureFor(student, structures);
    const discount = discountFor(student.id);
    const discountAmount = applyDiscount(tuition.amount, discount);

    const term1Net = tuition.amount - discountAmount;
    const term1: FeeInvoice = {
      id: `${student.id}-fee-term1`,
      studentId: student.id,
      feeStructureId: tuition.id,
      feeType: tuition.feeType,
      term: "Term 1",
      amount: tuition.amount,
      discountId: discount?.id,
      discountAmount,
      fineAmount: 0,
      netAmount: term1Net,
      dueDate: daysAgo(90),
      status: "paid",
      paidOn: daysAgo(88),
      paidAmount: term1Net,
    };
    invoices.push(term1);
    receipts.push(receiptFor(term1, term1Net, term1.paidOn!, receiptSeq++));

    const rotation = index % 4;
    const term2Net = tuition.amount - discountAmount;
    let term2: FeeInvoice = {
      id: `${student.id}-fee-term2`,
      studentId: student.id,
      feeStructureId: tuition.id,
      feeType: tuition.feeType,
      term: "Term 2",
      amount: tuition.amount,
      discountId: discount?.id,
      discountAmount,
      fineAmount: 0,
      netAmount: term2Net,
      dueDate: daysFromNow(12),
      status: "due",
    };

    if (rotation === 1) {
      term2 = { ...term2, dueDate: daysAgo(15), status: "overdue", fineAmount: 500, netAmount: term2Net + 500 };
    } else if (rotation === 2) {
      const paidAmount = Math.round(term2Net * 0.5);
      term2 = { ...term2, status: "partial", paidAmount, paidOn: daysAgo(3) };
      receipts.push(receiptFor(term2, paidAmount, term2.paidOn!, receiptSeq++));
    } else if (rotation === 3) {
      term2 = { ...term2, status: "paid", paidOn: daysAgo(5), paidAmount: term2Net };
      receipts.push(receiptFor(term2, term2Net, term2.paidOn!, receiptSeq++));
    }
    invoices.push(term2);

    const extraStructure = student.transport.required
      ? structures.find((s) => s.id === "fs-bus")!
      : structures.find((s) => s.id === "fs-library")!;
    const extra: FeeInvoice = {
      id: `${student.id}-fee-extra`,
      studentId: student.id,
      feeStructureId: extraStructure.id,
      feeType: extraStructure.feeType,
      term: "Term 1",
      amount: extraStructure.amount,
      discountAmount: 0,
      fineAmount: 0,
      netAmount: extraStructure.amount,
      dueDate: daysFromNow(20),
      status: "due",
    };
    invoices.push(extra);
  });

  if (invoices.length > 0) {
    const paidInvoice = invoices.find((inv) => inv.status === "paid" && inv.term === "Term 1");
    if (paidInvoice) {
      refunds.push({
        id: genId("refund"),
        invoiceId: paidInvoice.id,
        amount: Math.round(paidInvoice.netAmount * 0.2),
        reason: "Overpayment adjustment for withdrawn elective.",
        refundedOn: daysAgo(2),
        status: "pending",
      });
    }
    const processedSource = invoices.find((inv) => inv.status === "paid" && inv.id !== paidInvoice?.id);
    if (processedSource) {
      refunds.push({
        id: genId("refund"),
        invoiceId: processedSource.id,
        amount: Math.round(processedSource.netAmount * 0.1),
        reason: "Partial fee waiver approved by administration.",
        refundedOn: daysAgo(30),
        status: "processed",
      });
    }
  }

  return { invoices, receipts, refunds };
}
