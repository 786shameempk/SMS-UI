import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateReportCardRemark } from "../../generation/api";
import type { RemarkLength, RemarkTone, ReportCardRemark } from "../../generation/types";

const TONES: { value: RemarkTone; label: string }[] = [
  { value: "Encouraging", label: "Encouraging" },
  { value: "Balanced", label: "Balanced" },
  { value: "Formal", label: "Formal" },
];

/**
 * Drafts a report card remark from the student's results in this exam. The draft is shown separately; it only goes
 * into the remarks box when the teacher chooses "Use this remark", and is saved only when they press Save.
 */
export default function RemarkAssistant({ examId, studentId, onUse }: { examId: string; studentId: string; onUse: (remark: string) => void }) {
  const [open, setOpen] = useState(false);
  const [observations, setObservations] = useState("");
  const [tone, setTone] = useState<RemarkTone>("Encouraging");
  const [length, setLength] = useState<RemarkLength>("Medium");
  const [draft, setDraft] = useState<ReportCardRemark | null>(null);

  const generate = useMutation({ mutationFn: generateReportCardRemark, onSuccess: (r) => setDraft(r.content) });
  const run = () => generate.mutate({ examId, studentId, tone, length, observations: observations.trim() || undefined });

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" />
        Draft with AI
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3" aria-label="AI remark assistant" role="group">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
        <FormField label="Your observations" htmlFor="remark-observations" optional hint="Class work and behaviour you have seen. The AI also reads this exam's marks.">
          <Textarea id="remark-observations" rows={2} maxLength={1000} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="e.g. Participates well, needs to revise grammar" />
        </FormField>
        <FormField label="Tone" htmlFor="remark-tone">
          <Select value={tone} onValueChange={(v) => setTone(v as RemarkTone)}>
            <SelectTrigger id="remark-tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Length" htmlFor="remark-length">
          <Select value={length} onValueChange={(v) => setLength(v as RemarkLength)}>
            <SelectTrigger id="remark-length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Short">Short</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={run} disabled={generate.isPending}>
          {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : draft ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {draft ? "Regenerate" : "Generate draft"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); setDraft(null); generate.reset(); }}>
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>

      {generate.isError && <p role="alert" className="text-sm text-destructive">{generate.error.message}</p>}

      {draft && (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="info" dot>
              <Sparkles className="mr-1 h-3 w-3" />
              AI draft
            </Badge>
            {draft.basedOn.map((b) => (
              <Badge key={b} variant="neutral">
                {b}
              </Badge>
            ))}
          </div>
          <p className="whitespace-pre-wrap text-sm" aria-label="Draft remark">
            {draft.remark}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => { onUse(draft.remark); setOpen(false); setDraft(null); }}>
            <Check className="h-3.5 w-3.5" />
            Use this remark
          </Button>
          <p className="text-xs text-muted-foreground">Check it before saving: it goes into the remarks box for you to edit.</p>
        </div>
      )}
    </div>
  );
}
