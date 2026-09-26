import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ChevronRight, ClipboardList, FileCheck, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Student } from "@/features/students/types";
import { getAttendanceSummary, listFeeInvoices, listHomework } from "../api";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function ChildOverviewCard({ student, onView }: { student: Student; onView: () => void }) {
  const { data: attendance } = useQuery({
    queryKey: ["parent-portal", "attendance", student.id],
    queryFn: () => getAttendanceSummary(student.id),
  });
  const { data: homework = [] } = useQuery({
    queryKey: ["parent-portal", "homework", student.id],
    queryFn: () => listHomework(student.id),
  });
  const { data: fees = [] } = useQuery({
    queryKey: ["parent-portal", "fees", student.id],
    queryFn: () => listFeeInvoices(student.id),
  });

  const attendancePct = attendance && attendance.totalDays > 0 ? Math.round((attendance.presentDays / attendance.totalDays) * 100) : null;
  const pendingHomework = homework.filter((h) => h.status === "pending" || h.status === "overdue").length;
  const feesDue = fees.filter((f) => f.status !== "paid").reduce((sum, f) => sum + f.amount, 0);

  const stats = [
    {
      label: "Attendance",
      value: attendancePct !== null ? `${attendancePct}%` : "—",
      icon: CalendarCheck,
      tint: attendancePct === null ? "text-muted-foreground" : attendancePct >= 85 ? "text-success-strong" : attendancePct >= 75 ? "text-warning-strong" : "text-destructive-strong",
    },
    { label: "Homework due", value: String(pendingHomework), icon: ClipboardList, tint: pendingHomework > 0 ? "text-warning-strong" : "text-success-strong" },
    { label: "Fees due", value: feesDue > 0 ? formatCurrency(feesDue) : "Paid", icon: Wallet, tint: feesDue > 0 ? "text-destructive-strong" : "text-success-strong" },
  ];

  return (
    <Card interactive className="overflow-hidden">
      <div className="h-14 border-b border-border bg-accent/70" aria-hidden="true" />
      <CardContent className="-mt-10 p-5 pt-0 space-y-4">
        <button type="button" onClick={onView} className="flex items-start gap-3 cursor-pointer group w-full text-left">
          <Avatar className="w-16 h-16 ring-4 ring-card shadow-sm">
            {student.photoUrl && <AvatarImage src={student.photoUrl} alt={student.firstName} />}
            <AvatarFallback className="bg-brand-100 text-accent-foreground text-lg font-bold">{initialsOf(student.firstName, student.lastName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 mt-11">
            <p className="text-base font-semibold text-foreground group-hover:text-primary-text transition-colors truncate">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {student.className} - {student.section} &middot; {student.admissionNumber}
            </p>
          </div>
          <ChevronRight className="mt-12 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>

        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-secondary/40 px-1 py-3">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
              <p className={cn("text-sm font-bold tabular-nums", stat.tint)}>{stat.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground text-center">{stat.label}</p>
            </div>
          ))}
        </div>

        {attendancePct !== null && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-success" style={{ width: `${attendancePct}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Present {attendance!.presentDays} of {attendance!.totalDays} school days
            </p>
          </div>
        )}

        {student.medical.bloodGroup !== "unknown" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileCheck className="w-3.5 h-3.5" />
            Blood group <Badge variant="neutral">{student.medical.bloodGroup}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OverviewTab({ students, onViewChild }: { students: Student[]; onViewChild: (id: string) => void }) {
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No children are linked to this account yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Ask the school office to link your child to your login.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {students.map((child) => (
        <ChildOverviewCard key={child.id} student={child} onView={() => onViewChild(child.id)} />
      ))}
    </div>
  );
}
