import { useMutation } from "@tanstack/react-query";
import { Copy, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { RISK_REASON_CONFIG } from "../../constants";
import { explainAtRisk } from "../../generation/api";
import type { RiskReason } from "../../types";

const reasonLabel = (reason: string) => RISK_REASON_CONFIG[reason as RiskReason]?.label ?? reason;

/**
 * "Why flagged?" on an At-Risk card. The server recomputes this student's flags from their own records (and refuses a
 * student the viewer can't see); the AI only explains them and suggests supportive next steps. The student's name is
 * never sent to the model.
 */
export default function AtRiskExplanationPanel({ studentId }: { studentId: string }) {
  const explain = useMutation({ mutationFn: () => explainAtRisk(studentId) });
  const e = explain.data?.content;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy. Select the text instead.");
    }
  };

  if (!e) {
    return (
      <div className="mt-2 space-y-1.5">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => explain.mutate()} disabled={explain.isPending}>
          {explain.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {explain.isPending ? "Explaining…" : "Why flagged? Explain with AI"}
        </Button>
        {explain.isError && (
          <p role="alert" className="text-xs text-destructive">
            {explain.error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <section aria-label="AI explanation" className="mt-3 space-y-2.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> AI explanation of the flags above · a starting point, not a judgement
      </p>
      <p className="text-foreground">{e.summary}</p>
      <ul className="space-y-1">
        {e.factors.map((f) => (
          <li key={f.reason}>
            <span className="font-medium text-foreground">{reasonLabel(f.reason)}:</span> <span className="text-secondary-foreground">{f.explanation}</span>
          </li>
        ))}
      </ul>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supportive next steps</h4>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-secondary-foreground">
          {e.interventions.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opening the conversation with the family</h4>
        <div className="mt-1 flex items-start gap-2">
          <p className="flex-1 italic text-secondary-foreground">“{e.familyConversationStarter}”</p>
          <Button variant="ghost" size="icon-sm" aria-label="Copy conversation starter" onClick={() => void copy(e.familyConversationStarter)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
