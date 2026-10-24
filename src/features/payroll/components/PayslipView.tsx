import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Letterhead from "@/features/tenant/Letterhead";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { monthLabel } from "../constants";
import type { PayslipRow } from "../types";

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #payslip, #payslip * { visibility: visible; }
    #payslip { position: absolute; top: 0; left: 0; }
  }
`;

export default function PayslipView({
  open,
  onOpenChange,
  payslip,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslip: PayslipRow | null;
}) {
  const { t } = useTranslation("payroll");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle>{t("Payslip")}</DialogTitle>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            {t("Print")}
          </Button>
        </DialogHeader>

        <style>{PRINT_STYLE}</style>
        {payslip && (
          <div id="payslip" className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="text-center space-y-1 border-b border-border pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Payslip")}</p>
              <Letterhead />
              <p className="text-sm text-slate-500">{monthLabel(payslip.month)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t("Employee:")} </span>
                <span className="font-medium text-slate-800">
                  {payslip.staff.firstName} {payslip.staff.lastName}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("Employee ID:")} </span>
                <span className="font-medium text-slate-800">{payslip.staff.employeeId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("Designation:")} </span>
                <span className="font-medium text-slate-800">{payslip.staff.designation}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("Department:")} </span>
                <span className="font-medium text-slate-800">{payslip.staff.department}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("Bank:")} </span>
                <span className="font-medium text-slate-800">{payslip.staff.salary.bankName ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("Account:")} </span>
                <span className="font-medium text-slate-800">{payslip.staff.salary.bankAccountNumber ?? "—"}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border">
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-600">{t("Basic")}</span>
                <span className="tabular-nums text-slate-800">{formatCurrency(payslip.basic)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-600">{t("Allowances")}</span>
                <span className="tabular-nums text-slate-800">{formatCurrency(payslip.allowances)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-600">{t("Deductions")}</span>
                <span className="tabular-nums text-red-600">-{formatCurrency(payslip.deductions)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/40 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("Net pay")}</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(payslip.netPay)}</p>
              </div>
              <div className="text-end">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("Status")}</p>
                <Badge variant={payslip.paid ? "success" : "warning"}>{payslip.paid ? t("Paid") : t("Pending")}</Badge>
                {payslip.paid && payslip.paidOn && <p className="text-[11px] text-slate-400 mt-1">{formatDateTime(payslip.paidOn)}</p>}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">{t("This is a system-generated payslip and does not require a signature.")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
