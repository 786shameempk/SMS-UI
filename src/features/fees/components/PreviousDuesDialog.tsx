import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listStudentsPage } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { formatCurrency } from "@/utils/format";
import type { AddPreviousDuesParams } from "../types";

interface Row {
  student: Student;
  amount: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function PreviousDuesDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (values: AddPreviousDuesParams) => Promise<void>;
}) {
  const { t } = useTranslation("fees");
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState(today());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLabel("");
      setDueDate(today());
      setSearch("");
      setRows([]);
      setError(null);
    }
  }, [open]);

  const term = search.trim();
  const { data: results } = useQuery({
    queryKey: ["students", "previous-dues-search", term],
    queryFn: () => listStudentsPage({ pageIndex: 0, pageSize: 8, search: term }),
    enabled: open && term.length >= 2,
  });
  const candidates = (results?.items ?? []).filter((s) => !rows.some((r) => r.student.id === s.id));

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) > 0 ? Number(r.amount) : 0), 0);

  const add = (student: Student) => {
    setRows((current) => [...current, { student, amount: "" }]);
    setSearch("");
  };

  const submit = async () => {
    if (!label.trim()) return setError(t("Enter a name for these dues, e.g. 2023-24 balance"));
    if (!dueDate) return setError(t("Due date is required"));
    if (rows.length === 0) return setError(t("Add at least one student"));
    if (rows.some((r) => !(Number(r.amount) > 0))) return setError(t("Enter an amount greater than zero for every student"));
    setError(null);
    await onSubmit({ label, dueDate, items: rows.map((r) => ({ studentId: r.student.id, amount: Number(r.amount) })) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Add previous dues")}</DialogTitle>
          <DialogDescription>
            {t(
              "Record what students still owe from an earlier academic year, or from before your school started using SchoolSphere. Each becomes an invoice that can be paid, tracked and chased like any other.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pd-label" required>{t("Name of these dues")}</Label>
              <Input id="pd-label" value={label} maxLength={50} placeholder={t("e.g. 2023-24 balance")} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd-dueDate" required>{t("Due date")}</Label>
              <Input id="pd-dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pd-search">{t("Add a student")}</Label>
            <Input id="pd-search" value={search} placeholder={t("Search by name or admission number")} onChange={(e) => setSearch(e.target.value)} />
            {term.length >= 2 && (
              <ul className="rounded-md border divide-y max-h-44 overflow-y-auto">
                {candidates.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">{t("No matching students")}</li>
                ) : (
                  candidates.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => add(s)}>
                        <span className="font-medium text-foreground">{s.firstName} {s.lastName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{s.className} - {s.section}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {rows.length > 0 && (
            <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
              {rows.map((row) => (
                <div key={row.student.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.student.firstName} {row.student.lastName}</p>
                    <p className="text-xs text-muted-foreground">{row.student.className} - {row.student.section}</p>
                  </div>
                  <Input
                    aria-label={t("Amount due for {{name}}", { name: `${row.student.firstName} ${row.student.lastName}` })}
                    className="w-32"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={t("Amount")}
                    value={row.amount}
                    onChange={(e) => setRows((current) => current.map((r) => (r.student.id === row.student.id ? { ...r, amount: e.target.value } : r)))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("Remove")}
                    onClick={() => setRows((current) => current.filter((r) => r.student.id !== row.student.id))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <p className="text-sm text-muted-foreground">{t("{{count}} student(s), total {{amount}}", { count: rows.length, amount: formatCurrency(total) })}</p>
          )}
          {error && <p role="alert" className="text-xs text-destructive-strong">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button type="button" loading={submitting} onClick={submit}>
            {t("Add previous dues")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
