import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTENT_KEY, createContent } from "../../content/api";
import { lessonPlanToText } from "../../generation/assignment";
import type { LessonPlan } from "../../generation/types";

/** Monday of the current week, as YYYY-MM-DD in local time. */
function thisMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Sends an AI lesson plan into Review & Publish. Once approved and published it is filed in the Lesson Plans module under
 * the author (the server takes the teacher from the login, not from this page).
 */
export default function SaveLessonPlanForReview({ plan, classId, subjectId }: { plan: LessonPlan; classId: string; subjectId: string }) {
  const queryClient = useQueryClient();
  const [weekOf, setWeekOf] = useState(thisMonday);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      createContent({
        kind: "LessonPlan",
        title: plan.title.slice(0, 200),
        body: lessonPlanToText(plan),
        metadata: JSON.stringify({ classId, subjectId, weekOf }),
        aiGenerated: true,
        sourceFeature: "generate-lesson-plan",
      }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
      toast.success("Saved for review. Track it under Review & Publish.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (saved) return <p className="text-sm text-muted-foreground" role="status">Saved for review.</p>;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-xs text-muted-foreground" htmlFor="lp-week">
        <span className="block">Week of</span>
        <Input id="lp-week" type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} className="w-40" />
      </label>
      <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending || !weekOf}>
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Save for review
      </Button>
    </div>
  );
}
