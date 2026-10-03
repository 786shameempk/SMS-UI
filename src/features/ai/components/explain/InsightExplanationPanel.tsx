import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { explainInsight } from "../../generation/api";
import type { ExplainArea } from "../../generation/types";
import type { InsightArea } from "../../types";

const AREA: Record<InsightArea, ExplainArea> = { attendance: "Attendance", academics: "Academics", fees: "Fees", admissions: "Admissions" };

/**
 * "Explain with AI" under an Insights card. The server recomputes the area's figures itself (nothing is sent from
 * this page), and the explanation keeps findings, possible reasons and suggested actions apart.
 */
export default function InsightExplanationPanel({ area }: { area: InsightArea }) {
  const explain = useMutation({ mutationFn: () => explainInsight(AREA[area]) });
  const e = explain.data?.content;

  if (!e) {
    return (
      <div className="mt-3 space-y-2">
        <Button variant="outline" size="sm" onClick={() => explain.mutate()} disabled={explain.isPending}>
          {explain.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {explain.isPending ? "Explaining…" : "Explain with AI"}
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
    <section aria-label="AI explanation" className="mt-3 space-y-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> AI explanation · check before acting on it
      </p>
      <p className="text-foreground">{e.summary}</p>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What the data shows</h4>
        <ul className="mt-1 space-y-1">
          {e.findings.map((f) => (
            <li key={f.finding}>
              <span className="font-medium text-foreground">{f.finding}</span> <span className="text-muted-foreground">— {f.evidence}</span>
            </li>
          ))}
        </ul>
      </div>
      {e.possibleReasons.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Possible reasons to check</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-secondary-foreground">
            {e.possibleReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested next steps</h4>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-secondary-foreground">
          {e.suggestedActions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
      <Button variant="ghost" size="sm" onClick={() => explain.mutate()} disabled={explain.isPending}>
        {explain.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Explain again
      </Button>
    </section>
  );
}
