import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { User, UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { listRoles } from "@/features/administration/roles/api";
import { listUsers } from "@/features/administration/users/api";
import { shareCustomReport } from "./api";
import type { CustomReportSummary, ReportShare, ShareLevel } from "./types";

interface Props {
  report: CustomReportSummary | null;
  initialShares: ReportShare[];
  onClose: () => void;
}

const FAMILY_ROLES = ["parent", "student"];

/**
 * Who can run (or also edit) a report. Private means only the owner. Sharing never widens anyone's data access: a person
 * still can't run a report that uses a column or module their own role doesn't allow, and the server re-checks that on every run.
 */
export default function ShareDialog({ report, initialShares, onClose }: Props) {
  const { t } = useTranslation("reports");
  const queryClient = useQueryClient();
  const [shares, setShares] = useState<ReportShare[]>(initialShares);
  const [level, setLevel] = useState<ShareLevel>("Run");
  useEffect(() => setShares(initialShares), [initialShares, report?.id]);

  const roles = useQuery({ queryKey: ["share-roles"], queryFn: listRoles, enabled: report !== null, staleTime: 5 * 60_000, retry: false });
  const users = useQuery({ queryKey: ["share-users"], queryFn: listUsers, enabled: report !== null, staleTime: 5 * 60_000, retry: false });

  const save = useMutation({
    mutationFn: (next: ReportShare[]) => shareCustomReport(report!.id, next.length > 0 ? "Shared" : "Private", next),
    onSuccess: () => {
      toast.success(shares.length > 0 ? t("Sharing updated") : t("The report is private again"));
      void queryClient.invalidateQueries({ queryKey: ["custom-reports"] });
      void queryClient.invalidateQueries({ queryKey: ["custom-report", report?.id] });
      onClose();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t("Sharing could not be saved.")),
  });

  const has = (type: ReportShare["targetType"], target: string) => shares.some((s) => s.targetType === type && s.target.toLowerCase() === target.toLowerCase());
  const add = (type: ReportShare["targetType"], target: string, label: string) => {
    if (!target || has(type, target)) return;
    setShares((s) => [...s, { targetType: type, target, targetLabel: label, level }]);
  };

  const roleOptions = (roles.data ?? []).filter((r) => !FAMILY_ROLES.includes((r.key ?? r.name).toLowerCase()));
  const userOptions = (users.data ?? []).filter((u) => u.status === "active");

  return (
    <Dialog open={report !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Share “{{name}}”", { name: report?.name })}</DialogTitle>
          <DialogDescription>{t("Choose who can use this report. Everyone else cannot see it.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" htmlFor="share-level">{t("New shares can")}</label>
            <NativeSelect id="share-level" value={level} onChange={(e) => setLevel(e.target.value as ShareLevel)} className="w-56">
              <option value="Run">{t("Run and export (read-only)")}</option>
              <option value="Edit">{t("Run, export and edit")}</option>
            </NativeSelect>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-sm font-medium" htmlFor="share-role"><UserCog className="h-4 w-4" aria-hidden="true" />{t("Share with a role")}</label>
              <NativeSelect id="share-role" value="" onChange={(e) => { const r = roleOptions.find((x) => (x.key ?? x.name) === e.target.value); if (r) add("Role", r.key ?? r.name, r.name); }} disabled={roles.isError}>
                <option value="">{roles.isError ? t("Roles unavailable") : t("Choose a role…")}</option>
                {roleOptions.map((r) => <option key={r.id} value={r.key ?? r.name}>{r.name}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-sm font-medium" htmlFor="share-user"><User className="h-4 w-4" aria-hidden="true" />{t("Share with a person")}</label>
              <NativeSelect id="share-user" value="" onChange={(e) => { const u = userOptions.find((x) => x.id === e.target.value); if (u) add("User", u.id, u.name); }} disabled={users.isError}>
                <option value="">{users.isError ? t("People unavailable") : t("Choose a person…")}</option>
                {userOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </NativeSelect>
            </div>
          </div>
          {(roles.isError || users.isError) && <p className="text-xs text-muted-foreground">{t("Your account can't list every role or person. You can still keep or remove the shares below.")}</p>}

          {shares.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">{t("Private: only you can see this report.")}</p>
          ) : (
            <ul className="space-y-1.5" aria-label={t("Shared with")}>
              {shares.map((s) => (
                <li key={`${s.targetType}-${s.target}`} className="flex items-center gap-2 rounded-lg border bg-background p-1.5 ps-3">
                  {s.targetType === "Role" ? <UserCog className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 truncate text-sm">{s.targetLabel || s.target}<span className="ms-1 text-xs text-muted-foreground">({s.targetType === "Role" ? t("role") : t("person")})</span></span>
                  <NativeSelect value={s.level} onChange={(e) => setShares((all) => all.map((x) => (x === s ? { ...x, level: e.target.value as ShareLevel } : x)))} className="w-36" aria-label={t("Access for {{name}}", { name: s.targetLabel || s.target })}>
                    <option value="Run">{t("Run only")}</option>
                    <option value="Edit">{t("Can edit")}</option>
                  </NativeSelect>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShares((all) => all.filter((x) => x !== s))} aria-label={t("Stop sharing with {{name}}", { name: s.targetLabel || s.target })}><X className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button type="button" onClick={() => save.mutate(shares)} loading={save.isPending}>{t("Save sharing")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
