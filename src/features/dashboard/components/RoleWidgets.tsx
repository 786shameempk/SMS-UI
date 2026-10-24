import { AlertTriangle, Building2, CalendarCheck, PieChart, ShieldCheck, Trophy, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeDay } from "@/utils/format";
import type { Translate } from "../tabs/i18n";
import type { AlertItem, FeeDefaulter, LearnerAttendance, RankedItem, SchoolRow, SchoolsOverview, StatusSlice } from "../types";
import AlertList from "./widget-types/AlertList";
import CompactTable, { type CompactColumn } from "./widget-types/CompactTable";
import DoughnutChart from "./widget-types/DoughnutChart";
import RankingList from "./widget-types/RankingList";
import SegmentedProgress from "./widget-types/SegmentedProgress";
import WidgetCard from "./widget-types/WidgetCard";

/** Role-specific widgets, each a thin composition of the reusable widget types in ./widget-types. */

const inrCompact = (n: number) =>
  n >= 1_00_00_000 ? `₹${(n / 1_00_00_000).toFixed(1)}Cr` : n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

export function AlertsCard({ alerts }: { alerts: AlertItem[] }) {
  const { t } = useTranslation("dashboard");
  return (
    <WidgetCard
      title={t("Needs attention")}
      description={
        alerts.length
          ? alerts.length === 1
            ? t("{{count}} thing to look at today.", { count: alerts.length })
            : t("{{count}} things to look at today.", { count: alerts.length })
          : t("Fees, attendance and staffing at a glance.")
      }
      icon={ShieldCheck}
      isEmpty={alerts.length === 0}
      emptyTitle={t("All clear")}
      emptyDescription={t("No overdue fees, low attendance or unmarked registers right now.")}
    >
      <AlertList items={alerts} label={t("Things that need attention")} />
    </WidgetCard>
  );
}

export function ClassAttendanceCard({ items }: { items: RankedItem[] }) {
  const { t } = useTranslation("dashboard");
  const marked = items.filter((i) => i.value !== null);
  const avg = marked.length ? Math.round(marked.reduce((n, i) => n + (i.value ?? 0), 0) / marked.length) : null;
  return (
    <WidgetCard
      title={t("Class-wise attendance")}
      description={
        avg === null
          ? t("Today, by section.")
          : items.length > 5
            ? t("Today · {{avg}}% average across {{marked}} marked · top 5 of {{total}}.", { avg, marked: marked.length, total: items.length })
            : t("Today · {{avg}}% average across {{marked}} marked.", { avg, marked: marked.length })
      }
      icon={CalendarCheck}
      href="/attendance"
      hrefLabel={t("Attendance")}
      isEmpty={items.length === 0}
      emptyTitle={t("No sections yet")}
      emptyDescription={t("Sections with students appear here once attendance is set up.")}
    >
      <RankingList items={items.slice(0, 5)} numbered={false} label={t("Attendance by section")} />
    </WidgetCard>
  );
}

export function TopPerformersCard({ items, rangeLabel }: { items: RankedItem[]; rangeLabel: string }) {
  const { t } = useTranslation("dashboard");
  return (
    <WidgetCard
      title={t("Top performers")}
      description={t("Highest average exam score · {{range}}.", { range: rangeLabel })}
      icon={Trophy}
      href="/examinations"
      hrefLabel={t("Results")}
      isEmpty={items.length === 0}
      emptyTitle={t("No results yet")}
      emptyDescription={t("Students appear here once exam marks are entered for this period.")}
    >
      <RankingList items={items} label={t("Top performing students")} />
    </WidgetCard>
  );
}

export function FeeStatusCard({ slices }: { slices: StatusSlice[] }) {
  const { t } = useTranslation("dashboard");
  const total = slices.reduce((n, s) => n + s.value, 0);
  const paid = slices.find((s) => s.id === "paid")?.value ?? 0;
  return (
    <WidgetCard
      title={t("Fee collection status")}
      description={t("All invoices by status.")}
      icon={PieChart}
      href="/fees"
      hrefLabel={t("Fees")}
      isEmpty={slices.length === 0}
      emptyTitle={t("No invoices yet")}
      emptyDescription={t("The split appears once fee invoices are generated.")}
    >
      <DoughnutChart slices={slices} centerValue={total ? `${Math.round((paid / total) * 100)}%` : "—"} centerLabel={t("collected")} label={t("Invoices by status")} />
    </WidgetCard>
  );
}

const defaulterColumns = (t: Translate): CompactColumn<FeeDefaulter>[] => [
  {
    id: "student",
    header: t("Student"),
    cell: (d) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-foreground">{d.studentName}</span>
        <span className="block truncate text-xs text-muted-foreground">{d.className}</span>
      </span>
    ),
  },
  { id: "invoices", header: t("Invoices"), numeric: true, hideOnNarrow: true, cell: (d) => d.invoices },
  {
    id: "since",
    header: t("Overdue since"),
    hideOnNarrow: true,
    cell: (d) => (
      <Badge variant="danger" className="whitespace-nowrap">
        {formatRelativeDay(d.oldestDueDate)}
      </Badge>
    ),
  },
  { id: "amount", header: t("Outstanding"), numeric: true, cell: (d) => <span className="font-semibold text-destructive-strong">{formatCurrency(d.outstanding)}</span> },
];

export function FeeDefaultersCard({ defaulters }: { defaulters: FeeDefaulter[] }) {
  const { t } = useTranslation("dashboard");
  const total = defaulters.reduce((n, d) => n + d.outstanding, 0);
  return (
    <WidgetCard
      title={t("Fee defaulters")}
      description={
        defaulters.length
          ? t("Largest past-due balances · {{amount}} across the top {{count}}.", { amount: inrCompact(total), count: defaulters.length })
          : t("Students with fees past their due date.")
      }
      icon={Wallet}
      href="/fees"
      hrefLabel={t("Collect")}
      isEmpty={defaulters.length === 0}
      emptyTitle={t("No defaulters")}
      emptyDescription={t("Every past-due invoice has been paid.")}
    >
      <CompactTable columns={defaulterColumns(t)} rows={defaulters} rowKey={(d) => d.studentId} label={t("Students with the largest overdue fees")} />
    </WidgetCard>
  );
}

export function LearnerAttendanceCard({ learners }: { learners: LearnerAttendance[] }) {
  const { t } = useTranslation("dashboard");
  return (
    <WidgetCard
      title={t("Attendance (30 days)")}
      description={learners.length > 1 ? t("Each child's last 30 school days.") : t("Your last 30 school days.")}
      icon={CalendarCheck}
      isEmpty={learners.length === 0 || learners.every((l) => l.marked === 0)}
      emptyTitle={t("No attendance yet")}
      emptyDescription={t("Attendance appears here once the class register is marked.")}
    >
      <div className="space-y-5">
        {learners.map((l) => (
          <SegmentedProgress
            key={l.studentId}
            title={l.name}
            subtitle={
              l.marked === 1
                ? t("{{classLabel}} · {{count}} day marked", { classLabel: l.classLabel, count: l.marked })
                : t("{{classLabel}} · {{count}} days marked", { classLabel: l.classLabel, count: l.marked })
            }
            percent={l.percent}
            segments={[
              { id: "present", label: t("Present"), value: l.present, tone: "success" },
              { id: "late", label: t("Late"), value: l.late, tone: "warning" },
              { id: "absent", label: t("Absent"), value: l.absent, tone: "danger" },
              { id: "leave", label: t("Leave"), value: l.leave, tone: "info" },
            ]}
          />
        ))}
      </div>
    </WidgetCard>
  );
}

const STATUS_BADGE: Record<SchoolRow["status"], { label: string; variant: "success" | "info" | "warning" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  trial: { label: "Trial", variant: "info" },
  suspended: { label: "Suspended", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const schoolColumns = (t: Translate): CompactColumn<SchoolRow>[] => [
  {
    id: "school",
    header: t("School"),
    cell: (s) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-foreground">{s.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{s.plan}</span>
      </span>
    ),
  },
  { id: "status", header: t("Status"), cell: (s) => <Badge variant={STATUS_BADGE[s.status].variant}>{t(STATUS_BADGE[s.status].label)}</Badge> },
  { id: "students", header: t("Students"), numeric: true, cell: (s) => s.students.toLocaleString("en-IN") },
  { id: "staff", header: t("Staff"), numeric: true, hideOnNarrow: true, cell: (s) => s.staff.toLocaleString("en-IN") },
  {
    id: "capacity",
    header: t("Plan used"),
    numeric: true,
    hideOnNarrow: true,
    cell: (s) =>
      s.capacityPercent === null ? (
        "—"
      ) : (
        <span className={s.capacityPercent >= 90 ? "font-semibold text-warning-strong" : undefined}>{s.capacityPercent}%</span>
      ),
  },
];

export function SchoolsOverviewCard({ overview }: { overview: SchoolsOverview }) {
  const { t } = useTranslation("dashboard");
  const totals = overview.totals;
  const nearLimit = overview.rows.filter((r) => (r.capacityPercent ?? 0) >= 90).length;
  return (
    <WidgetCard
      title={t("Schools overview")}
      description={
        totals.suspended
          ? t("{{schools}} schools · {{active}} active, {{trial}} on trial, {{suspended}} suspended · {{students}} students, {{staff}} staff.", {
              schools: totals.schools,
              active: totals.active,
              trial: totals.trial,
              suspended: totals.suspended,
              students: totals.students.toLocaleString("en-IN"),
              staff: totals.staff.toLocaleString("en-IN"),
            })
          : t("{{schools}} schools · {{active}} active, {{trial}} on trial · {{students}} students, {{staff}} staff.", {
              schools: totals.schools,
              active: totals.active,
              trial: totals.trial,
              students: totals.students.toLocaleString("en-IN"),
              staff: totals.staff.toLocaleString("en-IN"),
            })
      }
      icon={Building2}
      href="/platform"
      hrefLabel={t("Platform console")}
      isEmpty={overview.rows.length === 0}
      emptyTitle={t("No schools yet")}
      emptyDescription={t("Schools appear here once they're created in the platform console.")}
    >
      {nearLimit > 0 && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-warning-strong">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {nearLimit === 1
            ? t("{{count}} school is near their plan's student limit.", { count: nearLimit })
            : t("{{count}} schools are near their plan's student limit.", { count: nearLimit })}
        </p>
      )}
      <CompactTable columns={schoolColumns(t)} rows={overview.rows.slice(0, 8)} rowKey={(s) => s.id} label={t("Schools on the platform")} />
    </WidgetCard>
  );
}
