import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatCurrency, formatRelativeDay } from "@/utils/format";
import type { FeeDueSummary } from "../types";

export default function FeeDueCard({ fees }: { fees: FeeDueSummary }) {
  const { t } = useTranslation("dashboard");
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{t("Fee due")}</CardTitle>
        <CardDescription>
          {t("{{amount}} pending", { amount: formatCurrency(fees.totalPending, fees.currency) })}
          {fees.totalOverdue > 0 && <span className="text-destructive-strong"> &middot; {t("{{amount}} overdue", { amount: formatCurrency(fees.totalOverdue, fees.currency) })}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {fees.items.length === 0 && <EmptyState bare size="sm" icon={Wallet} title={t("No fees due")} description={t("Upcoming and overdue fees appear here.")} className="h-full py-6" />}
        {fees.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.studentName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {item.term} &middot; {formatCurrency(item.amount)}
              </p>
            </div>
            <Badge variant={item.status === "overdue" ? "danger" : "warning"} className="shrink-0">
              {formatRelativeDay(item.dueDate)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
