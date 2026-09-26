import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ListChecks, MessageCircle, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listClasses, listSubjects } from "@/features/academics/api";
import { listTeachers } from "@/features/teachers/api";
import { useAuthStore } from "@/store/authStore";
import {
  createLearningResource,
  createQuiz,
  deleteLearningResource,
  deleteQuiz,
  listLearningResources,
  listQuizzes,
} from "../api";
import { RESOURCE_TYPE_ICONS, RESOURCE_TYPES } from "../constants";
import type { LearningResource, LearningResourceFormValues, QuizFormValues } from "../types";
import DiscussionThread from "./DiscussionThread";
import LearningResourceFormDialog from "./LearningResourceFormDialog";
import QuizFormDialog from "./QuizFormDialog";

export default function LearningResourcesTab() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [quizFormOpen, setQuizFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LearningResource | null>(null);
  const [discussionTarget, setDiscussionTarget] = useState<LearningResource | null>(null);

  const { data: resources = [], isLoading } = useQuery({ queryKey: ["homework", "resources"], queryFn: listLearningResources });
  const { data: quizzes = [] } = useQuery({ queryKey: ["homework", "quizzes"], queryFn: listQuizzes });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c] as const)), [classes]);
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s] as const)), [subjects]);
  const teacherById = useMemo(() => new Map(teachers.map((t) => [t.id, t] as const)), [teachers]);
  const quizById = useMemo(() => new Map(quizzes.map((q) => [q.id, q] as const)), [quizzes]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["homework"] });

  const createResourceMutation = useMutation({
    mutationFn: (values: LearningResourceFormValues) => createLearningResource(values),
    onSuccess: () => {
      invalidate();
      toast.success("Resource shared");
      setResourceFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not share resource"),
  });

  const createQuizMutation = useMutation({
    mutationFn: ({ values, createdByStaffId }: { values: QuizFormValues; createdByStaffId: string }) => createQuiz(values, createdByStaffId),
    onSuccess: () => {
      invalidate();
      toast.success("Quiz created");
      setQuizFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create quiz"),
  });

  const deleteMutation = useMutation({
    mutationFn: (resource: LearningResource) => (resource.type === "quiz" && resource.quizId ? deleteQuiz(resource.quizId) : deleteLearningResource(resource.id)),
    onSuccess: () => {
      invalidate();
      toast.success("Resource removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove resource"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Videos, notes, documents, discussions, and quizzes shared with a class.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setQuizFormOpen(true)}>
            <ListChecks className="w-4 h-4" />
            New quiz
          </Button>
          <Button onClick={() => setResourceFormOpen(true)}>
            <Plus className="w-4 h-4" />
            New resource
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading resources…</p>}
      {!isLoading && resources.length === 0 && <p className="text-sm text-muted-foreground">No learning resources shared yet.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {resources.map((resource) => {
          const Icon = RESOURCE_TYPE_ICONS[resource.type];
          const typeLabel = RESOURCE_TYPES.find((t) => t.value === resource.type)?.label ?? resource.type;
          const quiz = resource.quizId ? quizById.get(resource.quizId) : undefined;
          return (
            <Card key={resource.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-primary-text mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{resource.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {classById.get(resource.classId)?.name ?? "—"} · {subjectById.get(resource.subjectId)?.name ?? "—"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDeleteTarget(resource)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                <Badge variant="neutral">{typeLabel}</Badge>
                {resource.description && <p className="text-sm text-secondary-foreground line-clamp-2">{resource.description}</p>}
                <p className="text-xs text-muted-foreground">Shared by {teacherById.get(resource.createdByStaffId)?.firstName ?? "Unknown"}</p>

                {resource.type === "discussion" && (
                  <Button variant="outline" size="sm" onClick={() => setDiscussionTarget(resource)}>
                    <MessageCircle className="w-3.5 h-3.5" />
                    View discussion
                  </Button>
                )}
                {resource.type === "quiz" && quiz && <p className="text-xs text-muted-foreground">{quiz.questions.length} question(s)</p>}
                {resource.url && (
                  <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-text hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Open link
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LearningResourceFormDialog
        open={resourceFormOpen}
        onOpenChange={setResourceFormOpen}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        submitting={createResourceMutation.isPending}
        onSubmit={async (values) => {
          await createResourceMutation.mutateAsync(values);
        }}
      />

      <QuizFormDialog
        open={quizFormOpen}
        onOpenChange={setQuizFormOpen}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        submitting={createQuizMutation.isPending}
        onSubmit={async (values, createdByStaffId) => {
          await createQuizMutation.mutateAsync({ values, createdByStaffId });
        }}
      />

      <Dialog open={Boolean(discussionTarget)} onOpenChange={(v) => !v && setDiscussionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{discussionTarget?.title}</DialogTitle>
          </DialogHeader>
          {discussionTarget && (
            <DiscussionThread resourceId={discussionTarget.id} authorName={currentUser?.name ?? "Staff"} authorRole="Teacher" />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove resource"
        description={`Remove "${deleteTarget?.title}"? This can't be undone.`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}
