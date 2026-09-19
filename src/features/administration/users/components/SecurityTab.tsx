import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/utils/format";
import { listUserLoginHistory, setUserMfaEnabled } from "../api";
import type { LoginOutcome, SystemUser } from "../types";

const OUTCOME_CONFIG: Record<LoginOutcome, { label: string; variant: "success" | "danger" }> = {
  success: { label: "Signed in", variant: "success" },
  failed_password: { label: "Wrong password", variant: "danger" },
  failed_mfa: { label: "Failed 2FA code", variant: "danger" },
};

export default function SecurityTab({ user }: { user: SystemUser }) {
  const queryClient = useQueryClient();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["admin", "users", user.id, "login-history"],
    queryFn: () => listUserLoginHistory(user.id),
  });

  const mfaMutation = useMutation({
    mutationFn: (mfaEnabled: boolean) => setUserMfaEnabled(user.id, mfaEnabled),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`Two-factor authentication ${updated.mfaEnabled ? "enabled" : "disabled"} for ${updated.name}`);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            {user.mfaEnabled ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <ShieldOff className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Two-factor authentication</p>
            <p className="text-xs text-slate-500">This user must verify with a 6-digit code at every sign-in.</p>
          </div>
        </div>
        <Switch checked={user.mfaEnabled} onCheckedChange={(v) => mfaMutation.mutate(v)} disabled={mfaMutation.isPending} />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-800 mb-2">Login history</p>
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && history.length === 0 && <p className="text-sm text-muted-foreground">No login activity recorded.</p>}
          {history.map((entry) => {
            const config = OUTCOME_CONFIG[entry.outcome];
            return (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  {entry.outcome === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{entry.browser}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {entry.location} &middot; {entry.ipAddress} &middot; {formatDateTime(entry.at)}
                    </p>
                  </div>
                </div>
                <Badge variant={config.variant} className="shrink-0">
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
