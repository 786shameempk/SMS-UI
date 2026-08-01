import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ClipboardList, FileCheck, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
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

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <button type="button" onClick={onView} className="flex items-center gap-3 cursor-pointer group">
          <Avatar className="w-11 h-11">
            {student.photoUrl && <AvatarImage src={student.photoUrl} alt={student.firstName} />}
            <AvatarFallback>{initialsOf(student.firstName, student.lastName)}</AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {student.className} - {student.section} &middot; {student.admissionNumber}
            </p>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-secondary/60 py-2.5">
            <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-sm font-bold text-slate-800 tabular-nums">{attendancePct !== null ? `${attendancePct}%` : "—"}</p>
            <p className="text-[10px] text-slate-500">Attendance</p>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-secondary/60 py-2.5">
            <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-sm font-bold text-slate-800 tabular-nums">{pendingHomework}</p>
            <p className="text-[10px] text-slate-500">Homework due</p>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-secondary/60 py-2.5">
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-sm font-bold text-slate-800 tabular-nums">{feesDue > 0 ? formatCurrency(feesDue) : "—"}</p>
            <p className="text-[10px] text-slate-500">Fees due</p>
          </div>
        </div>

        {student.medical.bloodGroup !== "unknown" && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
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
    return <p className="text-sm text-muted-foreground">No children are linked to this account yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {students.map((child) => (
        <ChildOverviewCard key={child.id} student={child} onView={() => onViewChild(child.id)} />
      ))}
    </div>
  );
}
