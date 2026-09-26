import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { reportTalent } from "../api";
import { REPORT_REASONS } from "../constants";
import type { TalentReportReason } from "../types";

/** Report inappropriate public content. Goes privately to the creator's school admins, never the creator. */
export default function ReportDialog({ talentId, title, open, onOpenChange }: { talentId: string; title: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<TalentReportReason | null>(null);
  const [details, setDetails] = useState("");

  const mutation = useMutation({
    mutationFn: () => reportTalent(talentId, reason!, details.trim()),
    onSuccess: () => {
      toast.success("Thanks - the school's moderators will take a look.");
      void queryClient.invalidateQueries({ queryKey: ["talents", "detail", talentId] });
      onOpenChange(false);
      setReason(null);
      setDetails("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const needsDetails = reason === "other" && details.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report this showcase</DialogTitle>
          <DialogDescription className="line-clamp-1">“{title}”</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-2xl bg-teal-500/10 p-3 text-sm text-teal-800 dark:text-teal-200">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Your report is private. It goes to the school's moderators - the creator won't see who reported it.</p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground mb-2">What's the problem?</legend>
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              aria-pressed={reason === r.value}
              className={cn(
                "w-full text-left rounded-xl border px-3.5 py-2.5 transition-colors cursor-pointer",
                reason === r.value ? "border-violet-500 bg-violet-500/8 ring-1 ring-violet-500" : "border-border hover:bg-secondary/60",
              )}
            >
              <span className="block text-sm font-medium text-foreground">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.hint}</span>
            </button>
          ))}
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="report-details">Details {reason === "other" ? "" : "(optional)"}</Label>
          <Textarea id="report-details" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything that helps the moderators understand" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!reason || needsDetails || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
