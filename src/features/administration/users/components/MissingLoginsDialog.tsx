import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { reconcileLogins, type ReconcileReport } from "../api";

const OUTCOME_TONE: Record<string, BadgeVariant> = { Created: "success", Linked: "info", Skipped: "neutral", Failed: "danger", WouldCreateOrLink: "warning" };

/**
 * Staff, teachers and parents who are on the school's records but have no sign-in account (added before accounts were made
 * automatically, or when the account service was unavailable). It first shows what would happen, then does it. Safe to repeat.
 */
export default function MissingLoginsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("administration");
  const queryClient = useQueryClient();
  const [report, setReport] = useState<ReconcileReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: (dryRun: boolean) => reconcileLogins(dryRun),
    onSuccess: (r) => {
      setReport(r);
      setError(null);
      if (!r.dryRun) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
        void queryClient.invalidateQueries({ queryKey: ["staff"] });
        void queryClient.invalidateQueries({ queryKey: ["students"] });
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : t("Could not check the accounts")),
  });

  const close = (next: boolean) => {
    if (run.isPending) return;
    if (!next) {
      setReport(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const todo = report?.items.filter((i) => i.outcome === "WouldCreateOrLink").length ?? 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Create missing sign-in accounts")}</DialogTitle>
          <DialogDescription>
            {t("Finds staff, teachers and parents on your records who cannot sign in yet and gives each a one-time link to choose their own password. An account that already exists for the same person is linked, not changed. Safe to run again.")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive-strong">
            {error}
          </p>
        )}

        {report && (
          <div className="space-y-3">
            <p role="status" className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              {report.dryRun
                ? t("{{count}} account(s) can be created or linked.", { count: todo })
                : t("{{created}} created, {{linked}} linked, {{skipped}} skipped, {{failed}} failed.", { created: report.created, linked: report.linked, skipped: report.skipped, failed: report.failed })}
              {report.remaining > 0 && <span className="text-muted-foreground"> {t("{{count}} more are waiting; run it again.", { count: report.remaining })}</span>}
            </p>
            {report.studentsWithoutLogin > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("{{count}} student(s) have no sign-in of their own. Students sign in with their own email only when one was given at registration; parents see their children from the parent account.", { count: report.studentsWithoutLogin })}
              </p>
            )}
            {report.items.length > 0 && (
              <ul className="max-h-64 space-y-1 overflow-auto rounded-lg border border-border p-2 text-sm">
                {report.items.map((i, n) => (
                  <li key={`${i.email}-${n}`} className="flex flex-wrap items-center gap-2">
                    <Badge variant={OUTCOME_TONE[i.outcome] ?? "neutral"}>{i.outcome === "WouldCreateOrLink" ? t("Will create or link") : t(i.outcome)}</Badge>
                    <span className="font-medium">{i.name}</span>
                    <span className="text-muted-foreground">{i.email}</span>
                    {i.message && <span className="w-full text-xs text-muted-foreground">{i.message}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={run.isPending}>
            {t("Close")}
          </Button>
          <Button type="button" variant="outline" onClick={() => run.mutate(true)} loading={run.isPending && run.variables === true}>
            {t("Check what is missing")}
          </Button>
          <Button type="button" onClick={() => run.mutate(false)} loading={run.isPending && run.variables === false} disabled={report?.dryRun === true && todo === 0}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t("Create missing accounts")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
