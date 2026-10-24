import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/format";
import { recordSalaryPayment, updateSalary } from "../../api";
import type { SalaryDetails, StaffMember } from "../../types";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalaryTab({ staff }: { staff: StaffMember }) {
  const { t } = useTranslation("staff");
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    queryClient.invalidateQueries({ queryKey: ["staff", staff.id] });
  };

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<SalaryDetails>({ defaultValues: staff.salary });

  const salaryMutation = useMutation({
    mutationFn: (values: SalaryDetails) => updateSalary(staff.id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Salary structure saved"));
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () => recordSalaryPayment(staff.id, currentMonthKey()),
    onSuccess: () => {
      invalidate();
      toast.success(t("Payment recorded"));
    },
  });

  const net = staff.salary.basic + staff.salary.allowances - staff.salary.deductions;
  const alreadyPaidThisMonth = staff.salaryHistory.some((p) => p.month === currentMonthKey());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            {t("Salary structure")}
          </CardTitle>
          <CardDescription>{t("Net monthly salary: {{amount}}", { amount: formatCurrency(net) })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => salaryMutation.mutate(values))} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="basic">{t("Basic")}</Label>
                <Input id="basic" type="number" {...register("basic", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="allowances">{t("Allowances")}</Label>
                <Input id="allowances" type="number" {...register("allowances", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deductions">{t("Deductions")}</Label>
                <Input id="deductions" type="number" {...register("deductions", { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bankName">{t("Bank name")}</Label>
                <Input id="bankName" {...register("bankName")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNumber">{t("Account number")}</Label>
                <Input id="bankAccountNumber" {...register("bankAccountNumber")} />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={!isDirty || salaryMutation.isPending}>
              {salaryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("Save salary structure")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("Payment history")}</CardTitle>
            <CardDescription>{t("Monthly salary payments on record.")}</CardDescription>
          </div>
          <Button size="sm" disabled={alreadyPaidThisMonth || paymentMutation.isPending} onClick={() => paymentMutation.mutate()}>
            {paymentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {alreadyPaidThisMonth ? t("Paid this month") : t("Record this month's payment")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.salaryHistory.length === 0 && <p className="text-sm text-muted-foreground">{t("No payments recorded yet.")}</p>}
          {staff.salaryHistory.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">{p.month}</p>
              <p className="text-sm text-secondary-foreground tabular-nums">
                {t("{{amount}} · paid {{date}}", { amount: formatCurrency(p.amountPaid), date: new Date(p.paidOn).toLocaleDateString() })}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
