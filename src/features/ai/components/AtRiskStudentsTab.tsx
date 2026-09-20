import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, EyeOff, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RISK_REASON_CONFIG } from "../constants";
import { dismissStudentFlags, getAtRiskStudents, listDismissedFlags, restoreStudentFlags } from "../api";

function riskLabel(score: number): { label: string; variant: "danger" | "warning" | "info" } {
  if (score >= 60) return { label: "High risk", variant: "danger" };
  if (score >= 35) return { label: "Medium risk", variant: "warning" };
  return { label: "Low risk", variant: "info" };
}

export default function AtRiskStudentsTab() {
  const queryClient = useQueryClient();
  const [showDismissed, setShowDismissed] = useState(false);
  const { data: students = [], isLoading } = useQuery({ queryKey: ["ai", "at-risk", showDismissed], queryFn: () => getAtRiskStudents(showDismissed) });
  const { data: dismissedFlags = [] } = useQuery({ queryKey: ["ai", "dismissed"], queryFn: listDismissedFlags });

  const dismissedIds = new Set(dismissedFlags.map((d) => d.studentId));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ai", "at-risk"] });
    queryClient.invalidateQueries({ queryKey: ["ai", "dismissed"] });
  };

  const dismissMutation = useMutation({
    mutationFn: dismissStudentFlags,
    onSuccess: () => {
      invalidate();
      toast.success("Marked as reviewed");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreStudentFlags,
    onSuccess: () => {
      invalidate();
      toast.success("Restored to active list");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-lg">
          Students flagged by fixed rules over real attendance, exam, and fee data — a checklist for follow-up, not a prediction.
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowDismissed((v) => !v)}>
          {showDismissed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showDismissed ? "Hide reviewed" : "Show reviewed"}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && students.length === 0 && <p className="text-sm text-muted-foreground">No students currently flagged.</p>}

      <div className="space-y-3">
        {students.map((row) => {
          const risk = riskLabel(row.riskScore);
          const isDismissed = dismissedIds.has(row.student.id);
          return (
            <Card key={row.student.id} className={isDismissed ? "opacity-60" : undefined}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      {row.student.firstName} {row.student.lastName}
                      <Badge variant={risk.variant}>{risk.label}</Badge>
                      {isDismissed && <Badge variant="neutral">Reviewed</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.student.className} - {row.student.section} &middot; {row.student.admissionNumber}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {row.flags.map((f) => (
                        <li key={f.reason} className="text-sm text-slate-600">
                          <span className="font-medium text-slate-700">{RISK_REASON_CONFIG[f.reason].label}:</span> {f.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={dismissMutation.isPending || restoreMutation.isPending}
                  onClick={() => (isDismissed ? restoreMutation.mutate(row.student.id) : dismissMutation.mutate(row.student.id))}
                >
                  {isDismissed ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </>
                  ) : (
                    "Mark reviewed"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
