import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ShieldAlert, Syringe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import { BMI_CATEGORY_CONFIG, VACCINATION_STATUS_CONFIG, VISIT_OUTCOME_CONFIG } from "../constants";
import { getHealthReportsSummary } from "../api";
import type { BmiCategory } from "../types";

export default function ReportsTab() {
  const { t } = useTranslation("health");
  const { data: summary, isLoading } = useQuery({ queryKey: ["health", "reports"], queryFn: getHealthReportsSummary });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("Active students")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.totalActiveStudents}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent text-primary-text flex items-center justify-center shrink-0">
              <Activity className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("Students with allergies")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.studentsWithAllergies}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning-soft text-warning-strong flex items-center justify-center shrink-0">
              <AlertTriangle className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("Overdue vaccinations")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.overdueVaccinations.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-destructive-soft text-destructive-strong flex items-center justify-center shrink-0">
              <Syringe className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("Infirmary visits (30 days)")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading || !summary ? "—" : summary.visitsLast30Days}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-info-soft text-info-strong flex items-center justify-center shrink-0">
              <ShieldAlert className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("Overdue vaccinations")}</CardTitle>
            <CardDescription>{t("Past their due date with no dose administered — follow up with these families.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.overdueVaccinations.length === 0 && <p className="text-sm text-muted-foreground">{t("No overdue vaccinations.")}</p>}
            {summary?.overdueVaccinations.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {v.student.firstName} {v.student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t("{{vaccine}} (dose {{dose}}) · due {{when}}", { vaccine: v.vaccineName, dose: v.doseNumber, when: formatRelativeDay(v.dueDate) })}
                  </p>
                </div>
                <Badge variant={VACCINATION_STATUS_CONFIG.overdue.variant} className="shrink-0">
                  {t("Overdue")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Upcoming vaccinations")}</CardTitle>
            <CardDescription>{t("Due soon, not yet administered.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.upcomingVaccinations.length === 0 && <p className="text-sm text-muted-foreground">{t("Nothing due soon.")}</p>}
            {summary?.upcomingVaccinations.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {v.student.firstName} {v.student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
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
            <CardTitle>{t("Infirmary visit outcomes")}</CardTitle>
            <CardDescription>{t("All-time breakdown of how visits were resolved.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.visitsByOutcome.length === 0 && <p className="text-sm text-muted-foreground">{t("No visits logged yet.")}</p>}
            {summary?.visitsByOutcome.map((row) => (
              <div key={row.outcome} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{t(VISIT_OUTCOME_CONFIG[row.outcome].label)}</span>
                <span className="tabular-nums text-foreground font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("BMI distribution")}</CardTitle>
            <CardDescription>{t("Based on each student's most recent checkup.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!isLoading && summary?.bmiDistribution.length === 0 && <p className="text-sm text-muted-foreground">{t("No checkups recorded yet.")}</p>}
            {summary?.bmiDistribution.map((row) => (
              <div key={row.category} className="flex items-center justify-between text-sm">
                <Badge variant={BMI_CATEGORY_CONFIG[row.category as BmiCategory].variant}>{t(BMI_CATEGORY_CONFIG[row.category as BmiCategory].label)}</Badge>
                <span className="tabular-nums text-foreground font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
