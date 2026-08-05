import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listClasses, listSubjects } from "@/features/academics/api";
import { formatRelativeDay } from "@/utils/format";
import { listAssignedHomework } from "../api";
import { SUBMISSION_STATUS_CONFIG } from "../constants";
import type { AssignedHomeworkRow } from "../types";
import SubmitHomeworkDialog from "./SubmitHomeworkDialog";

export default function MyHomeworkListTab({ studentId }: { studentId: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["homework", "assigned", studentId],
    queryFn: () => listAssignedHomework(studentId),
    enabled: Boolean(studentId),
  });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });

  const [openRow, setOpenRow] = useState<AssignedHomeworkRow | null>(null);

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c] as const)), [classes]);
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s] as const)), [subjects]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(a.homework.dueDate).getTime() - new Date(b.homework.dueDate).getTime()),
    [rows],
  );

  return (
    <div className="space-y-3">
      {isLoading && <p className="text-sm text-muted-foreground">Loading homework…</p>}
      {!isLoading && sorted.length === 0 && <p className="text-sm text-muted-foreground">No homework assigned right now.</p>}

      {sorted.map((row) => {
        const config = SUBMISSION_STATUS_CONFIG[row.submission.status];
        return (
          <Card key={row.homework.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{row.homework.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {subjectById.get(row.homework.subjectId)?.name ?? "—"} · {classById.get(row.homework.classId)?.name ?? "—"} · Due{" "}
                  {formatRelativeDay(row.homework.dueDate)}
                  {row.submission.grade !== undefined ? ` · Grade: ${row.submission.grade}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={config.variant}>{config.label}</Badge>
                <Button size="sm" variant="outline" onClick={() => setOpenRow(row)}>
                  {row.submission.status === "not_submitted" ? "Submit" : "View"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <SubmitHomeworkDialog open={Boolean(openRow)} onOpenChange={(v) => !v && setOpenRow(null)} row={openRow} studentId={studentId} />
    </div>
  );
}
