import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatRelativeDay } from "@/utils/format";
import type { FeeDueSummary } from "../types";

export default function FeeDueCard({ fees }: { fees: FeeDueSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee due</CardTitle>
        <CardDescription>
          {formatCurrency(fees.totalPending, fees.currency)} pending
          {fees.totalOverdue > 0 && <span className="text-red-600"> &middot; {formatCurrency(fees.totalOverdue, fees.currency)} overdue</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {fees.items.length === 0 && <p className="text-sm text-muted-foreground">No fees due.</p>}
        {fees.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.studentName}</p>
              <p className="text-xs text-slate-500 truncate">
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
