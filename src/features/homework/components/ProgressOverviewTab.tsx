import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { getLearningProgress } from "../api";
import type { LearningProgressRow } from "../types";

const ALL_CLASSES = "__all__";

function pctVariant(pct: number): "success" | "warning" | "danger" {
  if (pct >= 75) return "success";
  if (pct >= 40) return "warning";
  return "danger";
}

export default function ProgressOverviewTab() {
  const { data: rows = [], isLoading, isError, refetch } = useQuery({ queryKey: ["homework", "progress"], queryFn: getLearningProgress });
  const [classFilter, setClassFilter] = useState(ALL_CLASSES);

  const classNames = useMemo(() => Array.from(new Set(rows.map((r) => r.className))).sort(), [rows]);

  const filtered = useMemo(() => {
    const scoped = classFilter === ALL_CLASSES ? rows : rows.filter((r) => r.className === classFilter);
    return [...scoped].sort((a, b) => a.className.localeCompare(b.className) || a.section.localeCompare(b.section) || a.studentName.localeCompare(b.studentName));
  }, [rows, classFilter]);

  const columns: ColumnDef<LearningProgressRow, unknown>[] = [
    { accessorKey: "className", header: "Class" },
    { accessorKey: "section", header: "Section" },
    { accessorKey: "studentName", header: "Student" },
    {
      id: "homework",
      header: "Homework submitted on time",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={r.homeworkAssignedCount ? pctVariant(r.homeworkSubmittedOnTimePct) : "neutral"}>{r.homeworkSubmittedOnTimePct}%</Badge>
            <span className="text-xs text-muted-foreground">
              {r.homeworkSubmittedOnTimeCount}/{r.homeworkAssignedCount}
            </span>
          </div>
        );
      },
    },
    {
      id: "resources",
      header: "Resources viewed",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={r.resourceCount ? pctVariant(r.resourceViewedPct) : "neutral"}>{r.resourceViewedPct}%</Badge>
            <span className="text-xs text-muted-foreground">
              {r.resourceViewedCount}/{r.resourceCount}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Illustrative view of homework and resource engagement, per student.</p>
        <div className="w-52">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES}>All classes</SelectItem>
              {classNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No active students found." pageSize={15} />
    </div>
  );
}
