import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/utils/cn";
import { DAYS_OF_WEEK, MEAL_TYPES } from "../constants";
import { listHostels, listMessMenu, updateMessMenuEntry } from "../api";
import type { DayOfWeek, MealType, MessMenuEntry } from "../types";
import MessMenuCellDialog from "./MessMenuCellDialog";

export default function MessMenuTab() {
  const queryClient = useQueryClient();
  const [hostelId, setHostelId] = useState("");
  const [editingCell, setEditingCell] = useState<{ day: DayOfWeek; meal: MealType } | null>(null);

  const { data: hostels = [] } = useQuery({ queryKey: ["hostel", "hostels"], queryFn: listHostels });
  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["hostel", "mess-menu", hostelId],
    queryFn: () => listMessMenu(hostelId),
    enabled: Boolean(hostelId),
  });

  useEffect(() => {
    if (!hostelId && hostels.length) setHostelId(hostels[0].id);
  }, [hostels, hostelId]);

  const updateMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: string }) => updateMessMenuEntry(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hostel", "mess-menu", hostelId] });
      toast.success("Menu updated");
      setEditingCell(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update menu"),
  });

  const entryFor = (day: DayOfWeek, meal: MealType): MessMenuEntry | undefined => menu.find((m) => m.day === day && m.meal === meal);
  const dayLabel = (day: DayOfWeek) => DAYS_OF_WEEK.find((d) => d.value === day)?.label ?? day;
  const mealLabel = (meal: MealType) => MEAL_TYPES.find((m) => m.value === meal)?.label ?? meal;

  const editingEntry = editingCell ? entryFor(editingCell.day, editingCell.meal) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5 w-64">
          <Label>Hostel</Label>
          <Select value={hostelId} onValueChange={setHostelId}>
            <SelectTrigger>
              <SelectValue placeholder="Select hostel" />
            </SelectTrigger>
            <SelectContent>
              {hostels.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading menu…</p>}

      {!isLoading && hostelId && (
        <Table containerClassName="rounded-xl border border-border bg-card">
          <TableHeader>
            <TableRow hover={false}>
              <TableHead>Day</TableHead>
              {MEAL_TYPES.map((meal) => (
                <TableHead key={meal.value}>{meal.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {DAYS_OF_WEEK.map((day, index) => (
              <TableRow key={day.value} className={cn(index % 2 === 1 && "bg-secondary/20")}>
                <TableCell className="align-top font-medium whitespace-nowrap">{day.label}</TableCell>
                {MEAL_TYPES.map((meal) => {
                  const entry = entryFor(day.value, meal.value);
                  return (
                    <TableCell key={meal.value} className="align-top">
                      <button
                        type="button"
                        onClick={() => setEditingCell({ day: day.value, meal: meal.value })}
                        className="group flex items-start gap-1.5 text-left cursor-pointer"
                      >
                        <span className="text-sm text-secondary-foreground">{entry?.items || "—"}</span>
                        <Pencil className="w-3 h-3 text-muted-foreground/70 group-hover:text-muted-foreground shrink-0 mt-0.5" />
                      </button>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <MessMenuCellDialog
        open={Boolean(editingCell)}
        onOpenChange={(v) => !v && setEditingCell(null)}
        entry={editingEntry ?? null}
        dayLabel={editingCell ? dayLabel(editingCell.day) : ""}
        mealLabel={editingCell ? mealLabel(editingCell.meal) : ""}
        submitting={updateMutation.isPending}
        onSubmit={async (items) => {
          if (editingEntry) await updateMutation.mutateAsync({ id: editingEntry.id, items });
        }}
      />
    </div>
  );
}
