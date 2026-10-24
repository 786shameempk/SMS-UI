import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/tables/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listClasses } from "@/features/academics/api";
import { listStudentsByIds } from "@/features/students/api";
import { formatCurrency, formatDate } from "@/utils/format";
import { listInvoicesPage } from "../api";
import { FEE_TYPE_OPTIONS } from "../constants";
import type { FeeInvoice, FeeInvoiceStatus } from "../types";

const ALL_FILTER = "__all__";
const FETCH_PAGE_SIZE = 100;
const UNPAID_STATUSES: FeeInvoiceStatus[] = ["overdue", "due", "partial"];
const DAY_MS = 86_400_000;

const AGE_BUCKETS = [
  { value: "1-30", label: "1-30 days", min: 1, max: 30 },
  { value: "31-60", label: "31-60 days", min: 31, max: 60 },
  { value: "61-90", label: "61-90 days", min: 61, max: 90 },
  { value: "90+", label: "Over 90 days", min: 91, max: Infinity },
] as const;

interface OverdueRow {
  invoice: FeeInvoice;
  studentName: string;
  /** False when the student record could not be loaded; studentName is then an English placeholder, translated at render. */
  studentKnown: boolean;
  className: string;
  outstanding: number;
  daysOverdue: number;
}

function daysSince(dueDate: string): number {
  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / DAY_MS);
}

/** Every invoice of one status (optionally one class), walking all pages. */
async function fetchAllByStatus(status: FeeInvoiceStatus, classId?: string): Promise<FeeInvoice[]> {
  const all: FeeInvoice[] = [];
  for (let pageIndex = 0; ; pageIndex++) {
    const page = await listInvoicesPage({ pageIndex, pageSize: FETCH_PAGE_SIZE, status, classId });
    all.push(...page.items);
    if (page.items.length === 0 || all.length >= page.totalCount) break;
  }
  return all;
}

async function loadOverdue(classId?: string): Promise<OverdueRow[]> {
  const invoices = (await Promise.all(UNPAID_STATUSES.map((s) => fetchAllByStatus(s, classId)))).flat();
  const late = invoices
    .map((invoice) => ({ invoice, outstanding: invoice.netAmount - (invoice.paidAmount ?? 0), daysOverdue: daysSince(invoice.dueDate) }))
    .filter((r) => r.outstanding > 0 && r.daysOverdue > 0);

  const ids = [...new Set(late.map((r) => r.invoice.studentId))];
  const chunks = Array.from({ length: Math.ceil(ids.length / FETCH_PAGE_SIZE) }, (_, i) => ids.slice(i * FETCH_PAGE_SIZE, (i + 1) * FETCH_PAGE_SIZE));
  const students = (await Promise.all(chunks.map((chunk) => listStudentsByIds(chunk)))).flat();
  const byId = new Map(students.map((s) => [s.id, s] as const));

  return late
    .map((r) => {
      const s = byId.get(r.invoice.studentId);
      return {
        ...r,
        studentName: s ? `${s.firstName} ${s.lastName}` : "Unknown student",
        studentKnown: Boolean(s),
        className: s ? `${s.className} - ${s.section}` : "",
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function ageVariant(days: number): "warning" | "danger" | "neutral" {
  return days > 60 ? "danger" : days > 30 ? "warning" : "neutral";
}

type TFunction = ReturnType<typeof useTranslation>["t"];

function buildColumns(t: TFunction): ColumnDef<OverdueRow, unknown>[] {
  const feeTypeLabel = (r: OverdueRow) => {
    const label = FEE_TYPE_OPTIONS.find((o) => o.value === r.invoice.feeType)?.label;
    return label ? t(label) : r.invoice.feeType;
  };
  const studentName = (r: OverdueRow) => (r.studentKnown ? r.studentName : t("Unknown student"));
  return [
    {
      id: "student",
      header: t("Student"),
      accessorFn: studentName,
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{studentName(row.original)}</p>
          <p className="text-xs text-muted-foreground">{row.original.className}</p>
        </div>
      ),
    },
    {
      id: "feeType",
      header: t("Fee type"),
      accessorFn: feeTypeLabel,
      cell: ({ row }) => <Badge variant="info">{feeTypeLabel(row.original)}</Badge>,
    },
    { id: "term", header: t("Term"), accessorFn: (r) => r.invoice.term, cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.invoice.term}</span> },
    {
      id: "dueDate",
      header: t("Due date"),
      accessorFn: (r) => r.invoice.dueDate.slice(0, 10),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatDate(row.original.invoice.dueDate)}</span>,
    },
    {
      id: "daysOverdue",
      header: t("Days overdue"),
      accessorFn: (r) => r.daysOverdue,
      cell: ({ row }) => <Badge variant={ageVariant(row.original.daysOverdue)}>{t("{{count}} days", { count: row.original.daysOverdue })}</Badge>,
    },
    {
      id: "outstanding",
      header: t("Outstanding"),
      accessorFn: (r) => r.outstanding,
      cell: ({ row }) => <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(row.original.outstanding)}</span>,
    },
  ];
}

export default function OverdueTab() {
  const { t } = useTranslation("fees");
  const columns = useMemo(() => buildColumns(t), [t]);
  const [classFilter, setClassFilter] = useState<string>(ALL_FILTER);
  const [ageFilter, setAgeFilter] = useState<string>(ALL_FILTER);

  const classId = classFilter === ALL_FILTER ? undefined : classFilter;
  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["fees", "overdue", classId ?? "all"],
    queryFn: () => loadOverdue(classId),
  });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const classOptions = useMemo(() => [...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), [classes]);

  const buckets = useMemo(
    () =>
      AGE_BUCKETS.map((b) => {
        const inBucket = rows.filter((r) => r.daysOverdue >= b.min && r.daysOverdue <= b.max);
        return { ...b, count: inBucket.length, total: inBucket.reduce((sum, r) => sum + r.outstanding, 0) };
      }),
    [rows],
  );
  const visible = useMemo(() => {
    const bucket = AGE_BUCKETS.find((b) => b.value === ageFilter);
    return bucket ? rows.filter((r) => r.daysOverdue >= bucket.min && r.daysOverdue <= bucket.max) : rows;
  }, [rows, ageFilter]);
  const totalOutstanding = visible.reduce((sum, r) => sum + r.outstanding, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {buckets.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => setAgeFilter(ageFilter === b.value ? ALL_FILTER : b.value)}
            className="cursor-pointer text-start"
            aria-pressed={ageFilter === b.value}
          >
            <Card className={ageFilter === b.value ? "ring-2 ring-ring" : undefined}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t(b.label)}</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(b.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {b.count === 1 ? t("1 invoice") : t("{{count}} invoices", { count: b.count })}
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <DataTable
        searchable
        searchPlaceholder={t("Search student…")}
        columns={columns}
        data={visible}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        exportFileName="overdue-fees"
        emptyMessage={t("No overdue fees. Everything past its due date has been paid.")}
        filters={
          <>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-40" aria-label={t("Class")}>
                <SelectValue placeholder={t("All classes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{t("All classes")}</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger className="w-40" aria-label={t("Overdue age")}>
                <SelectValue placeholder={t("Any age")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>{t("Any age")}</SelectItem>
                {AGE_BUCKETS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {t(b.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <span className="text-sm text-muted-foreground">
            {t("Total outstanding:")} <strong className="text-foreground">{formatCurrency(totalOutstanding)}</strong>
          </span>
        }
      />
    </div>
  );
}
