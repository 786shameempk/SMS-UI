import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ShieldAlert, Syringe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import { BMI_CATEGORY_CONFIG, VACCINATION_STATUS_CONFIG, VISIT_OUTCOME_CONFIG } from "../constants";
import { getHealthReportsSummary } from "../api";
import type { BmiCategory } from "../types";

export default function ReportsTab() {
  const { data: summary, isLoading } = useQuery({ queryKey: ["health", "reports"], queryFn: getHealthReportsSummary });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active students</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.totalActiveStudents}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Activity className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Students with allergies</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.studentsWithAllergies}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Overdue vaccinations</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.overdueVaccinations.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Syringe className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Infirmary visits (30 days)</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.visitsLast30Days}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Overdue vaccinations</CardTitle>
            <CardDescription>Past their due date with no dose administered — follow up with these families.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.overdueVaccinations.length === 0 && <p className="text-sm text-muted-foreground">No overdue vaccinations.</p>}
            {summary?.overdueVaccinations.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {v.student.firstName} {v.student.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {v.vaccineName} (dose {v.doseNumber}) &middot; due {formatRelativeDay(v.dueDate)}
                  </p>
                </div>
                <Badge variant={VACCINATION_STATUS_CONFIG.overdue.variant} className="shrink-0">
                  Overdue
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming vaccinations</CardTitle>
            <CardDescription>Due soon, not yet administered.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.upcomingVaccinations.length === 0 && <p className="text-sm text-muted-foreground">Nothing due soon.</p>}
            {summary?.upcomingVaccinations.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {v.student.firstName} {v.student.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {v.vaccineName} (dose {v.doseNumber})
                  </p>
                </div>
                <Badge variant={VACCINATION_STATUS_CONFIG.due.variant} className="shrink-0">
                  {formatRelativeDay(v.dueDate)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Infirmary visit outcomes</CardTitle>
            <CardDescription>All-time breakdown of how visits were resolved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.visitsByOutcome.length === 0 && <p className="text-sm text-muted-foreground">No visits logged yet.</p>}
            {summary?.visitsByOutcome.map((row) => (
              <div key={row.outcome} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{VISIT_OUTCOME_CONFIG[row.outcome].label}</span>
                <span className="tabular-nums text-slate-800 font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>BMI distribution</CardTitle>
            <CardDescription>Based on each student's most recent checkup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.bmiDistribution.length === 0 && <p className="text-sm text-muted-foreground">No checkups recorded yet.</p>}
            {summary?.bmiDistribution.map((row) => (
              <div key={row.category} className="flex items-center justify-between text-sm">
                <Badge variant={BMI_CATEGORY_CONFIG[row.category as BmiCategory].variant}>{BMI_CATEGORY_CONFIG[row.category as BmiCategory].label}</Badge>
                <span className="tabular-nums text-slate-800 font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
