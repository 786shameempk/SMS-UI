import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Sparkles, Square } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getRemark, saveRemark } from "@/features/examinations/api";
import type { StudentExamSummary } from "@/features/examinations/types";
import { draftClassRemarks } from "../../generation/classRemarks";
import type { BatchRemarkItem, RemarkLength, RemarkTone } from "../../generation/types";

type Step = "setup" | "drafting" | "review" | "saving";

interface Row {
  studentId: string;
  remark: string;
  error: string | null;
  include: boolean;
}

/**
 * Whole-class report card remarks. Students who already have a remark are skipped unless the teacher includes them;
 * every draft is reviewed and editable, and only ticked ones are saved.
 */
export default function ClassRemarksDialog({
  open,
  onOpenChange,
  examId,
  examName,
  results,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examName: string;
  results: StudentExamSummary[];
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("setup");
  const [tone, setTone] = useState<RemarkTone>("Encouraging");
  const [length, setLength] = useState<RemarkLength>("Medium");
  const [includeExisting, setIncludeExisting] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(0);
  const stopRequested = useRef(false);

  // Existing remarks decide who is skipped by default, and are shown next to a draft that would replace them.
  const existing = useQuery({
    queryKey: ["examinations", "remarks", examId, results.map((r) => r.studentId)],
    queryFn: async () => {
      const entries = await Promise.all(results.map(async (r) => [r.studentId, await getRemark(examId, r.studentId).catch(() => "")] as const));
      return new Map(entries);
    },
    enabled: open,
  });
  const existingRemark = (id: string) => existing.data?.get(id)?.trim() ?? "";

  const byId = useMemo(() => new Map(results.map((r) => [r.studentId, r])), [results]);
  const targets = results.filter((r) => includeExisting || !existingRemark(r.studentId));
  const withRemarks = results.length - results.filter((r) => !existingRemark(r.studentId)).length;

  // Closing is blocked mid-run so a half-finished batch is never lost by an accidental click outside.
  const close = (next: boolean) => {
    if (step === "drafting" || step === "saving") return;
    onOpenChange(next);
  };

  const toRows = (items: BatchRemarkItem[]): Row[] =>
    items.map((it) => ({ studentId: it.studentId, remark: it.remark ?? "", error: it.remark ? null : (it.error ?? "No draft."), include: Boolean(it.remark) }));

  const start = async () => {
    stopRequested.current = false;
    setStep("drafting");
    setDone(0);
    const items = await draftClassRemarks(examId, targets.map((t) => t.studentId), { tone, length }, {
      onProgress: (sofar) => setDone(sofar.length),
      shouldStop: () => stopRequested.current,
    });
    setRows(toRows(items));
    setStep("review");
  };

  const update = (studentId: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.include && r.remark.trim());

  const save = async () => {
    setStep("saving");
    let saved = 0;
    const failures: string[] = [];
    for (const r of chosen) {
      try {
        await saveRemark(examId, r.studentId, r.remark.trim());
        saved += 1;
      } catch {
        failures.push(byId.get(r.studentId)?.studentName ?? r.studentId);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["examinations", "remark"] });
    queryClient.invalidateQueries({ queryKey: ["examinations", "remarks", examId] });
    if (saved) toast.success(`Saved ${saved} remark${saved === 1 ? "" : "s"}`);
    if (failures.length) {
      toast.error(`Could not save: ${failures.join(", ")}`);
      setStep("review");
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Draft report card remarks — {examName}</DialogTitle>
          <DialogDescription>AI drafts one remark per student from their marks. Review and edit each one; only the ticked remarks are saved.</DialogDescription>
        </DialogHeader>

        {step === "setup" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Tone" htmlFor="class-remark-tone">
                <Select value={tone} onValueChange={(v) => setTone(v as RemarkTone)}>
                  <SelectTrigger id="class-remark-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Encouraging">Encouraging</SelectItem>
                    <SelectItem value="Balanced">Balanced</SelectItem>
                    <SelectItem value="Formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Length" htmlFor="class-remark-length">
                <Select value={length} onValueChange={(v) => setLength(v as RemarkLength)}>
                  <SelectTrigger id="class-remark-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Short">Short</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            {existing.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking existing remarks…
              </p>
            ) : (
              withRemarks > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox id="class-remark-existing" checked={includeExisting} onCheckedChange={(c) => setIncludeExisting(c === true)} />
                  <Label htmlFor="class-remark-existing">
                    Also redraft the {withRemarks} student{withRemarks === 1 ? " who already has" : "s who already have"} a remark
                  </Label>
                </div>
              )
            )}
            <p className="text-sm text-muted-foreground">
              {targets.length} student{targets.length === 1 ? "" : "s"} will get a draft. Each counts as one AI request towards your daily limit.
            </p>
          </div>
        )}

        {step === "drafting" && (
          <div className="space-y-3 py-4" aria-live="polite">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Drafting {Math.min(done, targets.length)} of {targets.length}…
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Drafting remarks" aria-valuenow={done} aria-valuemin={0} aria-valuemax={targets.length}>
              <div className="h-full bg-primary transition-all" style={{ width: `${targets.length ? (done / targets.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {(step === "review" || step === "saving") && (
          <ul className="space-y-3" aria-label="Draft remarks">
            {rows.map((r) => {
              const s = byId.get(r.studentId);
              const current = existingRemark(r.studentId);
              return (
                <li key={r.studentId} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Checkbox
                      id={`include-${r.studentId}`}
                      checked={r.include}
                      disabled={Boolean(r.error) || step === "saving"}
                      onCheckedChange={(c) => update(r.studentId, { include: c === true })}
                      aria-label={`Save remark for ${s?.studentName ?? "student"}`}
                    />
                    <Label htmlFor={`include-${r.studentId}`} className="font-medium">
                      {s?.studentName ?? "Unknown student"}
                    </Label>
                    {s && (
                      <span className="text-xs text-muted-foreground">
                        {s.percentage}% · {s.grade}
                      </span>
                    )}
                    {!r.error && (
                      <Badge variant="info" dot>
                        <Sparkles className="mr-1 h-3 w-3" />
                        AI draft
                      </Badge>
                    )}
                  </div>
                  {r.error ? (
                    <p className="text-sm text-destructive">{r.error}</p>
                  ) : (
                    <Textarea
                      aria-label={`Remark for ${s?.studentName ?? "student"}`}
                      rows={3}
                      maxLength={2000}
                      value={r.remark}
                      disabled={step === "saving"}
                      onChange={(e) => update(r.studentId, { remark: e.target.value })}
                    />
                  )}
                  {current && !r.error && <p className="text-xs text-muted-foreground">Replaces: {current}</p>}
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          {step === "setup" && (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={start} disabled={existing.isLoading || targets.length === 0}>
                <Sparkles className="h-4 w-4" />
                Draft {targets.length} remark{targets.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
          {step === "drafting" && (
            <Button variant="outline" onClick={() => (stopRequested.current = true)}>
              <Square className="h-4 w-4" />
              Stop after this batch
            </Button>
          )}
          {(step === "review" || step === "saving") && (
            <>
              <Button variant="outline" onClick={() => close(false)} disabled={step === "saving"}>
                Discard
              </Button>
              <Button onClick={save} disabled={chosen.length === 0 || step === "saving"}>
                {step === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save {chosen.length} remark{chosen.length === 1 ? "" : "s"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
