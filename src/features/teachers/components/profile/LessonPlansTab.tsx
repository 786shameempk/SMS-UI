import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listClasses, listSubjects } from "@/features/academics/api";
import type { StaffMember } from "@/features/staff/types";
import LessonPlanFormDialog from "../LessonPlanFormDialog";
import { createLessonPlan, deleteLessonPlan, listLessonPlans, updateLessonPlan } from "../../api";
import type { LessonPlan, LessonPlanFormValues } from "../../types";

export default function LessonPlansTab({ staff }: { staff: StaffMember }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["teachers", "lesson-plans", staff.id],
    queryFn: () => listLessonPlans(staff.id),
  });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["teachers", "lesson-plans", staff.id] });

  const createMutation = useMutation({
    mutationFn: createLessonPlan,
    onSuccess: () => {
      invalidate();
      toast.success("Lesson plan created");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: LessonPlanFormValues }) => updateLessonPlan(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Lesson plan updated");
      setFormOpen(false);
      setEditingPlan(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLessonPlan(id),
    onSuccess: () => {
      invalidate();
      toast.success("Lesson plan deleted");
      setDeleteId(null);
    },
  });

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "Unknown class";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-slate-400" />
          Lesson plans
        </CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingPlan(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New lesson plan
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading lesson plans…</p>}
        {!isLoading && plans.length === 0 && <p className="text-sm text-muted-foreground">No lesson plans yet.</p>}
        {!isLoading &&
          plans.map((plan) => (
            <div key={plan.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-800">{plan.title}</p>
                  <Badge variant={plan.status === "published" ? "success" : "neutral"}>{plan.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {subjectName(plan.subjectId)} &middot; {className(plan.classId)} &middot; Week of{" "}
                  {new Date(plan.weekOf).toLocaleDateString()}
                </p>
                <p className="text-sm text-slate-600 mt-1.5">{plan.description}</p>
                {plan.attachmentNote && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {plan.attachmentNote}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingPlan(plan);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteId(plan.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
      </CardContent>

      <LessonPlanFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingPlan(null);
        }}
        plan={editingPlan}
        classes={classes}
        subjects={subjects}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingPlan) await updateMutation.mutateAsync({ id: editingPlan.id, values: { ...values, staffId: staff.id } });
          else await createMutation.mutateAsync({ ...values, staffId: staff.id });
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete lesson plan"
        description="This lesson plan will be permanently removed."
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
      />
    </Card>
  );
}
