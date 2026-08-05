import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, ListChecks, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listClasses, listSubjects } from "@/features/academics/api";
import { listStudents } from "@/features/students/api";
import { getViewedResourceIds, listLearningResources, listQuizzes, markResourceViewed } from "../api";
import { RESOURCE_TYPE_ICONS, RESOURCE_TYPES } from "../constants";
import type { LearningResource } from "../types";
import DiscussionThread from "./DiscussionThread";
import TakeQuizDialog from "./TakeQuizDialog";

export default function MyResourcesTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [discussionTarget, setDiscussionTarget] = useState<LearningResource | null>(null);
  const [quizResourceTarget, setQuizResourceTarget] = useState<LearningResource | null>(null);

  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: resources = [], isLoading } = useQuery({ queryKey: ["homework", "resources"], queryFn: listLearningResources });
  const { data: quizzes = [] } = useQuery({ queryKey: ["homework", "quizzes"], queryFn: listQuizzes });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: viewedIds = [] } = useQuery({
    queryKey: ["homework", "resource-views", studentId],
    queryFn: () => getViewedResourceIds(studentId),
    enabled: Boolean(studentId),
  });

  const viewMutation = useMutation({
    mutationFn: (resourceId: string) => markResourceViewed(studentId, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework", "resource-views", studentId] });
      queryClient.invalidateQueries({ queryKey: ["homework", "progress"] });
    },
  });

  const student = students.find((s) => s.id === studentId);
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s] as const)), [subjects]);
  const quizById = useMemo(() => new Map(quizzes.map((q) => [q.id, q] as const)), [quizzes]);
  const viewedSet = useMemo(() => new Set(viewedIds), [viewedIds]);

  const myResources = useMemo(() => {
    if (!student) return [];
    const schoolClass = classes.find((c) => c.name === student.className);
    if (!schoolClass) return [];
    return resources.filter((r) => r.classId === schoolClass.id);
  }, [resources, classes, student]);

  const markViewed = (resourceId: string) => {
    if (!viewedSet.has(resourceId)) viewMutation.mutate(resourceId);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading resources…</p>;
  if (!student) return <p className="text-sm text-muted-foreground">Select a student to browse their resources.</p>;
  if (myResources.length === 0) return <p className="text-sm text-muted-foreground">No learning resources shared for your class yet.</p>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {myResources.map((resource) => {
          const Icon = RESOURCE_TYPE_ICONS[resource.type];
          const typeLabel = RESOURCE_TYPES.find((t) => t.value === resource.type)?.label ?? resource.type;
          const viewed = viewedSet.has(resource.id);
          const quiz = resource.quizId ? quizById.get(resource.quizId) : undefined;
          return (
            <Card key={resource.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{resource.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{subjectById.get(resource.subjectId)?.name ?? "—"}</p>
                  </div>
                </div>
                {viewed && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                <Badge variant="neutral">{typeLabel}</Badge>
                {resource.description && <p className="text-sm text-slate-600 line-clamp-2">{resource.description}</p>}

                {resource.type === "discussion" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDiscussionTarget(resource);
                      markViewed(resource.id);
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    View discussion
                  </Button>
                )}

                {resource.type === "quiz" && quiz && (
                  <Button size="sm" onClick={() => setQuizResourceTarget(resource)}>
                    <ListChecks className="w-3.5 h-3.5" />
                    Take quiz ({quiz.questions.length}q)
                  </Button>
                )}

                {resource.url && resource.type !== "quiz" && resource.type !== "discussion" && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => markViewed(resource.id)}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open link
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(discussionTarget)} onOpenChange={(v) => !v && setDiscussionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{discussionTarget?.title}</DialogTitle>
          </DialogHeader>
          {discussionTarget && student && (
            <DiscussionThread resourceId={discussionTarget.id} authorName={`${student.firstName} ${student.lastName}`} authorRole="Student" />
          )}
        </DialogContent>
      </Dialog>

      <TakeQuizDialog
        open={Boolean(quizResourceTarget)}
        onOpenChange={(v) => !v && setQuizResourceTarget(null)}
        quiz={quizResourceTarget?.quizId ? quizById.get(quizResourceTarget.quizId) ?? null : null}
        studentId={studentId}
      />
    </div>
  );
}
