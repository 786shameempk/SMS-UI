import { AlertTriangle, Building2, CalendarCheck, PieChart, ShieldCheck, Trophy, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeDay } from "@/utils/format";
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
  return (
    <WidgetCard
      title="Needs attention"
      description={alerts.length ? `${alerts.length} thing${alerts.length === 1 ? "" : "s"} to look at today.` : "Fees, attendance and staffing at a glance."}
      icon={ShieldCheck}
      isEmpty={alerts.length === 0}
      emptyTitle="All clear"
      emptyDescription="No overdue fees, low attendance or unmarked registers right now."
    >
      <AlertList items={alerts} label="Things that need attention" />
    </WidgetCard>
  );
}

export function ClassAttendanceCard({ items }: { items: RankedItem[] }) {
  const marked = items.filter((i) => i.value !== null);
  const avg = marked.length ? Math.round(marked.reduce((n, i) => n + (i.value ?? 0), 0) / marked.length) : null;
  return (
    <WidgetCard
      title="Class-wise attendance"
      description={
        avg === null
          ? "Today, by section."
          : `Today · ${avg}% average across ${marked.length} marked${items.length > 5 ? ` · top 5 of ${items.length}` : ""}.`
      }
      icon={CalendarCheck}
      href="/attendance"
      hrefLabel="Attendance"
      isEmpty={items.length === 0}
      emptyTitle="No sections yet"
      emptyDescription="Sections with students appear here once attendance is set up."
    >
      <RankingList items={items.slice(0, 5)} numbered={false} label="Attendance by section" />
    </WidgetCard>
  );
}

export function TopPerformersCard({ items, rangeLabel }: { items: RankedItem[]; rangeLabel: string }) {
  return (
    <WidgetCard
      title="Top performers"
      description={`Highest average exam score · ${rangeLabel}.`}
      icon={Trophy}
      href="/examinations"
      hrefLabel="Results"
      isEmpty={items.length === 0}
      emptyTitle="No results yet"
      emptyDescription="Students appear here once exam marks are entered for this period."
    >
      <RankingList items={items} label="Top performing students" />
    </WidgetCard>
  );
}

export function FeeStatusCard({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  const paid = slices.find((s) => s.id === "paid")?.value ?? 0;
  return (
    <WidgetCard
      title="Fee collection status"
      description="All invoices by status."
      icon={PieChart}
      href="/fees"
      hrefLabel="Fees"
      isEmpty={slices.length === 0}
      emptyTitle="No invoices yet"
      emptyDescription="The split appears once fee invoices are generated."
    >
      <DoughnutChart slices={slices} centerValue={total ? `${Math.round((paid / total) * 100)}%` : "—"} centerLabel="collected" label="Invoices by status" />
    </WidgetCard>
  );
}

const DEFAULTER_COLUMNS: CompactColumn<FeeDefaulter>[] = [
  {
    id: "student",
    header: "Student",
    cell: (d) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-foreground">{d.studentName}</span>
        <span className="block truncate text-xs text-muted-foreground">{d.className}</span>
      </span>
    ),
  },
  { id: "invoices", header: "Invoices", numeric: true, hideOnNarrow: true, cell: (d) => d.invoices },
  {
    id: "since",
    header: "Overdue since",
    hideOnNarrow: true,
    cell: (d) => (
      <Badge variant="danger" className="whitespace-nowrap">
        {formatRelativeDay(d.oldestDueDate)}
      </Badge>
    ),
  },
  { id: "amount", header: "Outstanding", numeric: true, cell: (d) => <span className="font-semibold text-destructive-strong">{formatCurrency(d.outstanding)}</span> },
];

export function FeeDefaultersCard({ defaulters }: { defaulters: FeeDefaulter[] }) {
  const total = defaulters.reduce((n, d) => n + d.outstanding, 0);
  return (
    <WidgetCard
      title="Fee defaulters"
      description={defaulters.length ? `Largest past-due balances · ${inrCompact(total)} across the top ${defaulters.length}.` : "Students with fees past their due date."}
      icon={Wallet}
      href="/fees"
      hrefLabel="Collect"
      isEmpty={defaulters.length === 0}
      emptyTitle="No defaulters"
      emptyDescription="Every past-due invoice has been paid."
    >
      <CompactTable columns={DEFAULTER_COLUMNS} rows={defaulters} rowKey={(d) => d.studentId} label="Students with the largest overdue fees" />
    </WidgetCard>
  );
}

export function LearnerAttendanceCard({ learners }: { learners: LearnerAttendance[] }) {
  return (
    <WidgetCard
      title="Attendance (30 days)"
      description={learners.length > 1 ? "Each child's last 30 school days." : "Your last 30 school days."}
      icon={CalendarCheck}
      isEmpty={learners.length === 0 || learners.every((l) => l.marked === 0)}
      emptyTitle="No attendance yet"
      emptyDescription="Attendance appears here once the class register is marked."
    >
      <div className="space-y-5">
        {learners.map((l) => (
          <SegmentedProgress
            key={l.studentId}
            title={l.name}
            subtitle={`${l.classLabel} · ${l.marked} day${l.marked === 1 ? "" : "s"} marked`}
            percent={l.percent}
            segments={[
              { id: "present", label: "Present", value: l.present, tone: "success" },
              { id: "late", label: "Late", value: l.late, tone: "warning" },
              { id: "absent", label: "Absent", value: l.absent, tone: "danger" },
              { id: "leave", label: "Leave", value: l.leave, tone: "info" },
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

const SCHOOL_COLUMNS: CompactColumn<SchoolRow>[] = [
  {
    id: "school",
    header: "School",
    cell: (s) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-foreground">{s.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{s.plan}</span>
      </span>
    ),
  },
  { id: "status", header: "Status", cell: (s) => <Badge variant={STATUS_BADGE[s.status].variant}>{STATUS_BADGE[s.status].label}</Badge> },
  { id: "students", header: "Students", numeric: true, cell: (s) => s.students.toLocaleString("en-IN") },
  { id: "staff", header: "Staff", numeric: true, hideOnNarrow: true, cell: (s) => s.staff.toLocaleString("en-IN") },
  {
    id: "capacity",
    header: "Plan used",
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
  const t = overview.totals;
  const nearLimit = overview.rows.filter((r) => (r.capacityPercent ?? 0) >= 90).length;
  return (
    <WidgetCard
      title="Schools overview"
      description={`${t.schools} schools · ${t.active} active, ${t.trial} on trial${t.suspended ? `, ${t.suspended} suspended` : ""} · ${t.students.toLocaleString("en-IN")} students, ${t.staff.toLocaleString("en-IN")} staff.`}
      icon={Building2}
      href="/platform"
      hrefLabel="Platform console"
      isEmpty={overview.rows.length === 0}
      emptyTitle="No schools yet"
      emptyDescription="Schools appear here once they're created in the platform console."
    >
      {nearLimit > 0 && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-warning-strong">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {nearLimit} school{nearLimit === 1 ? " is" : "s are"} near their plan&apos;s student limit.
        </p>
      )}
      <CompactTable columns={SCHOOL_COLUMNS} rows={overview.rows.slice(0, 8)} rowKey={(s) => s.id} label="Schools on the platform" />
    </WidgetCard>
  );
}
