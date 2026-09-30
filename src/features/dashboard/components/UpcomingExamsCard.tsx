import { FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatRelativeDay } from "@/utils/format";
import type { UpcomingExam } from "../types";

export default function UpcomingExamsCard({ exams }: { exams: UpcomingExam[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Upcoming exams</CardTitle>
        <CardDescription>Next scheduled assessments.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {exams.length === 0 && <EmptyState bare size="sm" icon={FileCheck2} title="No upcoming exams" description="Scheduled exams will show up here." className="h-full py-6" />}
        {exams.map((exam) => (
          <div key={exam.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{exam.subject}</p>
              <p className="text-xs text-muted-foreground truncate">
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
