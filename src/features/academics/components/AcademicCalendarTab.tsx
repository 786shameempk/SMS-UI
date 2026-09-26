import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { CALENDAR_EVENT_TYPES } from "../constants";
import { createCalendarEvent, deleteCalendarEvent, listAcademicYears, listCalendarEvents, updateCalendarEvent } from "../api";
import type { CalendarEvent, CalendarEventFormValues, CalendarEventType } from "../types";
import CalendarEventFormDialog from "./CalendarEventFormDialog";
import { RowActions } from "@/components/ui/row-actions";

const TYPE_VARIANT: Record<CalendarEventType, "info" | "warning" | "danger" | "neutral"> = {
  term_start: "info",
  term_end: "info",
  exam: "danger",
  holiday: "warning",
  other: "neutral",
};

function typeLabel(type: CalendarEventType): string {
  return CALENDAR_EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function AcademicCalendarTab() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading, isError, refetch } = useQuery({ queryKey: ["academics", "calendar-events"], queryFn: listCalendarEvents });
  const { data: academicYears = [] } = useQuery({ queryKey: ["academics", "academic-years"], queryFn: listAcademicYears });

  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academics", "calendar-events"] });

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      invalidate();
      toast.success("Event added");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CalendarEventFormValues }) => updateCalendarEvent(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Event updated");
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      invalidate();
      toast.success("Event deleted");
      setDeleteTarget(null);
    },
  });

  const sorted = useMemo(
    () =>
      [...events]
        .filter((e) => typeFilter === "all" || e.type === typeFilter)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [events, typeFilter],
  );

  const columns: ColumnDef<CalendarEvent, unknown>[] = [
    {
      accessorKey: "title",
      header: "Event",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.title}</p>
          {row.original.description && <p className="text-xs text-muted-foreground max-w-sm truncate">{row.original.description}</p>}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant={TYPE_VARIANT[row.original.type]}>{typeLabel(row.original.type)}</Badge>,
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.startDate}
          {row.original.endDate && row.original.endDate !== row.original.startDate ? ` → ${row.original.endDate}` : ""}
        </span>
      ),
    },
    {
      id: "academicYear",
      header: "Academic year",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {academicYears.find((y) => y.id === row.original.academicYearId)?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const event = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(event);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(event)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {CALENDAR_EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add event
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={sorted} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No calendar events yet." />

      <CalendarEventFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        event={editing}
        academicYears={academicYears}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete calendar event"
        description={`This will permanently delete "${deleteTarget?.title}".`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
