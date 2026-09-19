import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Student } from "@/features/students/types";
import { formatCurrency } from "@/utils/format";
import { FEE_TYPE_OPTIONS, PAYMENT_MODE_OPTIONS } from "../constants";
import type { FeeInvoice, Receipt } from "../types";

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #fee-receipt, #fee-receipt * { visibility: visible; }
    #fee-receipt { position: absolute; top: 0; left: 0; }
  }
`;

export default function ReceiptView({
  open,
  onOpenChange,
  receipt,
  invoice,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
  invoice?: FeeInvoice;
  student?: Student;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle>Fee receipt</DialogTitle>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
        </DialogHeader>

        <style>{PRINT_STYLE}</style>
        {receipt && (
          <div id="fee-receipt" className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="text-center space-y-1 border-b border-border pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Receipt</p>
              <h2 className="text-lg font-bold text-slate-900">EduCore School</h2>
              <p className="text-sm text-slate-500">Receipt No: {receipt.receiptNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Student: </span>
                <span className="font-medium text-slate-800">{student ? `${student.firstName} ${student.lastName}` : "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Admission No.: </span>
                <span className="font-medium text-slate-800">{student?.admissionNumber ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Class: </span>
                <span className="font-medium text-slate-800">{student ? `${student.className} - ${student.section}` : "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fee type: </span>
                <span className="font-medium text-slate-800">
                  {invoice ? FEE_TYPE_OPTIONS.find((o) => o.value === invoice.feeType)?.label : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Term: </span>
                <span className="font-medium text-slate-800">{invoice?.term ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid on: </span>
                <span className="font-medium text-slate-800">{new Date(receipt.paidOn).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/40 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount paid</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(receipt.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment mode</p>
                <p className="text-sm font-semibold text-slate-800">
                  {PAYMENT_MODE_OPTIONS.find((o) => o.value === receipt.paymentMode)?.label}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">This is a system-generated receipt and does not require a signature.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
