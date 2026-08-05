import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listClasses, listSubjects, listTerms } from "@/features/academics/api";
import {
  createExam,
  createExamSchedule,
  deleteExam,
  deleteExamSchedule,
  listExamSchedules,
  listExams,
  updateExam,
  updateExamSchedule,
} from "../api";
import { EXAM_TYPE_LABELS, examStatusBadgeVariant } from "../constants";
import type { Exam, ExamFormValues, ExamSchedule, ExamScheduleFormValues } from "../types";
import ExamFormDialog from "./ExamFormDialog";
import ExamScheduleFormDialog from "./ExamScheduleFormDialog";

export default function ExamsTab() {
  const queryClient = useQueryClient();
  const { data: exams = [], isLoading: examsLoading } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["examinations", "exam-schedules"],
    queryFn: () => listExamSchedules(),
  });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: terms = [] } = useQuery({ queryKey: ["academics", "terms"], queryFn: listTerms });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });

  const [examFormOpen, setExamFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteExamTarget, setDeleteExamTarget] = useState<Exam | null>(null);

  const [scheduleFilter, setScheduleFilter] = useState<string | undefined>();
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ExamSchedule | null>(null);

  const invalidateExams = () => queryClient.invalidateQueries({ queryKey: ["examinations", "exams"] });
  const invalidateSchedules = () => queryClient.invalidateQueries({ queryKey: ["examinations", "exam-schedules"] });

  const createExamMutation = useMutation({
    mutationFn: createExam,
    onSuccess: (exam) => {
      invalidateExams();
      toast.success("Exam created");
      setExamFormOpen(false);
      setScheduleFilter(exam.id);
    },
  });
  const updateExamMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExamFormValues }) => updateExam(id, values),
    onSuccess: () => {
      invalidateExams();
      toast.success("Exam updated");
      setExamFormOpen(false);
      setEditingExam(null);
    },
  });
  const deleteExamMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      invalidateExams();
      invalidateSchedules();
      toast.success("Exam deleted");
      setDeleteExamTarget(null);
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: ({ examId, values }: { examId: string; values: ExamScheduleFormValues }) => createExamSchedule(examId, values),
    onSuccess: () => {
      invalidateSchedules();
      toast.success("Subject schedule added");
      setScheduleFormOpen(false);
    },
  });
  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExamScheduleFormValues }) => updateExamSchedule(id, values),
    onSuccess: () => {
      invalidateSchedules();
      toast.success("Subject schedule updated");
      setScheduleFormOpen(false);
      setEditingSchedule(null);
    },
  });
  const deleteScheduleMutation = useMutation({
    mutationFn: deleteExamSchedule,
    onSuccess: () => {
      invalidateSchedules();
      toast.success("Subject schedule removed");
      setDeleteScheduleTarget(null);
    },
  });

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "—";
  const termName = (id: string) => terms.find((t) => t.id === id)?.name ?? "—";
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";

  const activeScheduleExamId = scheduleFilter ?? exams[0]?.id;
  const filteredSchedules = useMemo(
    () => schedules.filter((s) => s.examId === activeScheduleExamId),
    [schedules, activeScheduleExamId],
  );

  const examColumns: ColumnDef<Exam, unknown>[] = [
    { accessorKey: "name", header: "Exam", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.name}</span> },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="info">{EXAM_TYPE_LABELS[row.original.examType]}</Badge>,
    },
    { id: "class", header: "Class", cell: ({ row }) => <span className="text-sm text-slate-600">{className(row.original.classId)}</span> },
    { id: "term", header: "Term", cell: ({ row }) => <span className="text-sm text-slate-600">{termName(row.original.termId)}</span> },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.startDate} &rarr; {row.original.endDate}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={examStatusBadgeVariant(row.original.status)} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const exam = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setScheduleFilter(exam.id)}>
                <Plus className="w-3.5 h-3.5" />
                View schedule
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingExam(exam);
                  setExamFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteExamTarget(exam)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const scheduleColumns: ColumnDef<ExamSchedule, unknown>[] = [
    { id: "subject", header: "Subject", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{subjectName(row.original.subjectId)}</span> },
    { accessorKey: "date", header: "Date" },
    {
      id: "time",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 tabular-nums">
          {row.original.startTime} &ndash; {row.original.endTime}
        </span>
      ),
    },
    {
      id: "marks",
      header: "Max / pass marks",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 tabular-nums">
          {row.original.maxMarks} / {row.original.passMarks}
        </span>
      ),
    },
    { id: "room", header: "Room", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.room || "—"}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const schedule = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingSchedule(schedule);
                  setScheduleFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteScheduleTarget(schedule)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <DataTableToolbar>
          <p className="text-sm text-slate-500">Exams are scoped to a class and term; add subject schedules below once created.</p>
          <Button
            onClick={() => {
              setEditingExam(null);
              setExamFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New exam
          </Button>
        </DataTableToolbar>
        <DataTable columns={examColumns} data={exams} isLoading={examsLoading} emptyMessage="No exams yet." />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Subject schedule</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Per-subject date, time, room, and marks for the selected exam.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={activeScheduleExamId} onValueChange={setScheduleFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} &middot; {className(e.classId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!activeScheduleExamId}
              onClick={() => {
                setEditingSchedule(null);
                setScheduleFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={scheduleColumns}
            data={filteredSchedules}
            isLoading={schedulesLoading}
            emptyMessage={exams.length === 0 ? "Create an exam first." : "No subjects scheduled for this exam yet."}
          />
        </CardContent>
      </Card>

      <ExamFormDialog
        open={examFormOpen}
        onOpenChange={(v) => {
          setExamFormOpen(v);
          if (!v) setEditingExam(null);
        }}
        exam={editingExam}
        classes={classes}
        terms={terms}
        submitting={createExamMutation.isPending || updateExamMutation.isPending}
        onSubmit={async (values) => {
          if (editingExam) await updateExamMutation.mutateAsync({ id: editingExam.id, values });
          else await createExamMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteExamTarget)}
        onOpenChange={(v) => !v && setDeleteExamTarget(null)}
        title="Delete exam"
        description={`This will permanently delete "${deleteExamTarget?.name}" along with its subject schedule and any recorded marks.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteExamMutation.isPending}
        onConfirm={() => {
          if (deleteExamTarget) deleteExamMutation.mutate(deleteExamTarget.id);
        }}
      />

      <ExamScheduleFormDialog
        open={scheduleFormOpen}
        onOpenChange={(v) => {
          setScheduleFormOpen(v);
          if (!v) setEditingSchedule(null);
        }}
        schedule={editingSchedule}
        subjects={subjects}
        submitting={createScheduleMutation.isPending || updateScheduleMutation.isPending}
        onSubmit={async (values) => {
          if (editingSchedule) await updateScheduleMutation.mutateAsync({ id: editingSchedule.id, values });
          else if (activeScheduleExamId) await createScheduleMutation.mutateAsync({ examId: activeScheduleExamId, values });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteScheduleTarget)}
        onOpenChange={(v) => !v && setDeleteScheduleTarget(null)}
        title="Delete subject schedule"
        description={`This will remove "${deleteScheduleTarget ? subjectName(deleteScheduleTarget.subjectId) : ""}" from the exam along with any marks recorded for it.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteScheduleMutation.isPending}
        onConfirm={() => {
          if (deleteScheduleTarget) deleteScheduleMutation.mutate(deleteScheduleTarget.id);
        }}
      />
    </div>
  );
}
