import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import { listHomework } from "../api";
import type { HomeworkStatus } from "../types";

const STATUS_CONFIG: Record<HomeworkStatus, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "Pending", variant: "warning" },
  submitted: { label: "Submitted", variant: "info" },
  graded: { label: "Graded", variant: "success" },
  overdue: { label: "Overdue", variant: "danger" },
};

export default function HomeworkTab({ studentId }: { studentId: string }) {
  const { data: homework = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "homework", studentId],
    queryFn: () => listHomework(studentId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homework</CardTitle>
        <CardDescription>Assignments across all subjects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading homework…</p>}
        {!isLoading && homework.length === 0 && <p className="text-sm text-muted-foreground">No homework assigned.</p>}
        {homework.map((hw) => {
          const config = STATUS_CONFIG[hw.status];
          return (
            <div key={hw.id} className="flex items-center justify-between rounded-lg border border-border p-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{hw.title}</p>
                <p className="text-xs text-muted-foreground">
                  {hw.subject} &middot; Due {formatRelativeDay(hw.dueDate)}
                  {hw.grade ? ` · Grade: ${hw.grade}` : ""}
                </p>
              </div>
              <Badge variant={config.variant} className="shrink-0">
                {config.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
