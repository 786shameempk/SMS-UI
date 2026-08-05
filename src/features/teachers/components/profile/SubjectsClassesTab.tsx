import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listClasses, listSubjects } from "@/features/academics/api";
import type { StaffMember } from "@/features/staff/types";
import AssignSubjectDialog from "../AssignSubjectDialog";
import { assignSubject, listSubjectAssignments, removeSubjectAssignment } from "../../api";

export default function SubjectsClassesTab({ staff }: { staff: StaffMember }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["teachers", "subject-assignments", staff.id],
    queryFn: () => listSubjectAssignments(staff.id),
  });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["teachers", "subject-assignments", staff.id] });

  const assignMutation = useMutation({
    mutationFn: (values: { subjectId: string; classId: string }) => assignSubject({ staffId: staff.id, ...values }),
    onSuccess: () => {
      invalidate();
      toast.success("Subject assigned");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not assign subject"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeSubjectAssignment(id),
    onSuccess: () => {
      invalidate();
      toast.success("Assignment removed");
      setRemoveId(null);
    },
  });

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "Unknown class";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-400" />
          Subjects &amp; classes
        </CardTitle>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Assign subject
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading assignments…</p>}
        {!isLoading && assignments.length === 0 && (
          <p className="text-sm text-muted-foreground">No subjects or classes assigned yet.</p>
        )}
        {!isLoading &&
          assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{subjectName(a.subjectId)}</p>
                <p className="text-xs text-slate-500">{className(a.classId)}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setRemoveId(a.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
      </CardContent>

      <AssignSubjectDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        classes={classes}
        subjects={subjects}
        submitting={assignMutation.isPending}
        onSubmit={async (values) => {
          await assignMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(v) => !v && setRemoveId(null)}
        title="Remove assignment"
        description="This will unassign the subject and class from this teacher."
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={removeMutation.isPending}
        onConfirm={() => {
          if (removeId) removeMutation.mutate(removeId);
        }}
      />
    </Card>
  );
}
