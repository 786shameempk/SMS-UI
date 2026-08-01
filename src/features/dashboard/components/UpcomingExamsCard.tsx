import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import type { UpcomingExam } from "../types";

export default function UpcomingExamsCard({ exams }: { exams: UpcomingExam[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming exams</CardTitle>
        <CardDescription>Next scheduled assessments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {exams.length === 0 && <p className="text-sm text-muted-foreground">No exams scheduled.</p>}
        {exams.map((exam) => (
          <div key={exam.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{exam.subject}</p>
              <p className="text-xs text-slate-500 truncate">
                {exam.className} &middot; {exam.durationMinutes} min
              </p>
            </div>
            <Badge variant="info" className="shrink-0">
              {formatRelativeDay(exam.date)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
