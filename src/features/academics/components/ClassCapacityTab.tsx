import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { listClasses, listSections } from "../api";
import type { Section } from "../types";

interface CapacityRow extends Section {
  className: string;
  utilization: number;
}

function UtilizationBar({ utilization }: { utilization: number }) {
  const pct = Math.min(100, Math.round(utilization * 100));
  const color = utilization >= 0.95 ? "bg-destructive" : utilization >= 0.75 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="h-2 w-28 rounded-full bg-secondary overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

export default function ClassCapacityTab() {
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: sections = [], isLoading, isError, refetch } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const [classFilter, setClassFilter] = useState("all");

  const rows: CapacityRow[] = useMemo(
    () =>
      sections
        .filter((s) => classFilter === "all" || s.classId === classFilter)
        .map((s) => ({
          ...s,
          className: classes.find((c) => c.id === s.classId)?.name ?? "—",
          utilization: s.capacity > 0 ? s.currentStrength / s.capacity : 0,
        })),
    [sections, classes, classFilter],
  );

  const totals = useMemo(
    () =>
      sections.reduce(
        (acc, s) => ({ capacity: acc.capacity + s.capacity, strength: acc.strength + s.currentStrength }),
        { capacity: 0, strength: 0 },
      ),
    [sections],
  );

  const columns: ColumnDef<CapacityRow, unknown>[] = [
    {
      id: "section",
      header: "Section",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.className}</p>
          <p className="text-xs text-muted-foreground">{row.original.name}</p>
        </div>
      ),
    },
    {
      id: "strength",
      header: "Enrolled",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{row.original.currentStrength}</span>,
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{row.original.capacity}</span>,
    },
    {
      id: "utilization",
      header: "Utilization",
      cell: ({ row }) => <UtilizationBar utilization={row.original.utilization} />,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const u = row.original.utilization;
        if (u >= 1) return <Badge variant="danger">Full</Badge>;
        if (u >= 0.75) return <Badge variant="warning">Near capacity</Badge>;
        return <Badge variant="success">Available</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Overall enrollment</CardTitle>
          <CardDescription>Total enrolled students against seat capacity across all sections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{totals.strength}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{totals.capacity}</p>
              <p className="text-xs text-muted-foreground">Total capacity</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {totals.capacity > 0 ? Math.round((totals.strength / totals.capacity) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Utilization</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTableToolbar>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={rows} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No sections match this filter." />
    </div>
  );
}
