import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import type { PendingAssignment } from "../types";

export default function PendingAssignmentsCard({ assignments }: { assignments: PendingAssignment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending assignments</CardTitle>
        <CardDescription>Work due soon.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
        {assignments.map((assignment) => {
          const pct =
            assignment.totalCount && assignment.submittedCount !== undefined
              ? Math.round((assignment.submittedCount / assignment.totalCount) * 100)
              : null;
          return (
            <div key={assignment.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{assignment.title}</p>
                <span className="text-xs font-medium text-amber-600 shrink-0">{formatRelativeDay(assignment.dueDate)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {assignment.subject} &middot; {assignment.className}
              </p>
              {pct !== null && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {assignment.submittedCount}/{assignment.totalCount} submitted
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
