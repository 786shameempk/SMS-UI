import { useQuery } from "@tanstack/react-query";
import { Building2, GraduationCap, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { getPlatformReportsSummary } from "../api";

export default function ReportsTab() {
  const { data: summary, isLoading } = useQuery({ queryKey: ["platform", "reports"], queryFn: getPlatformReportsSummary });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total tenants</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.totalTenants}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary ? `${summary.activeTenants} active · ${summary.trialTenants} trial · ${summary.suspendedTenants} suspended` : ""}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Building2 className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Monthly recurring revenue</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : formatCurrency(summary.mrrInr)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Wallet className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Students across tenants</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.totalStudentsAcrossTenants.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Staff across tenants</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.totalStaffAcrossTenants.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants by plan</CardTitle>
          <CardDescription>Which plan tier tenants are subscribed to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!isLoading && summary?.tenantsByPlan.length === 0 && <p className="text-sm text-muted-foreground">No tenants yet.</p>}
          {summary?.tenantsByPlan.map((row) => (
            <div key={row.planId} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{row.planName}</span>
              <span className="tabular-nums text-slate-800 font-medium">{row.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        MRR includes trial tenants at their assigned plan's list price for illustration — a real billing system would only count tenants past their trial period.
      </p>
    </div>
  );
}
