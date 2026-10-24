import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listRoles, resetRoleStaffPermissions, setRoleStaffPermissions, STAFF_PERMISSIONS_QUERY_KEY, getStaffPermissions } from "../api";

const FAMILY_ROLES = ["parent", "student"];

const MODULE_TITLES: Record<string, string> = {
  "module.library": "Library",
  "module.visitors": "Visitor management",
  "module.helpdesk": "Help desk",
  "module.fees": "Fees",
  "module.transport": "Transport",
};

/**
 * What staff in each role may *do* inside the modules they can see (the matrix decides what they see): issue or return
 * books, check visitors in, handle tickets, record fee payments... Used by the Staff mobile app and enforced by the
 * services. Roles start with every action of the modules they have "action" rights on in the matrix; saving makes the
 * ticked list exact. Applies at each user's next sign-in.
 */
export default function StaffActionsTab() {
  const { t } = useTranslation("administration");
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });
  const staff = useQuery({ queryKey: STAFF_PERMISSIONS_QUERY_KEY, queryFn: getStaffPermissions });
  const [roleId, setRoleId] = useState<string>("");
  const [draft, setDraft] = useState<{ roleId: string; keys: Set<string> } | null>(null);

  const selectedId = roleId || roles.data?.[0]?.id || "";
  const role = roles.data?.find((r) => r.id === selectedId);
  const current = staff.data?.roles.find((r) => r.roleId === selectedId);
  const keys = draft?.roleId === selectedId ? draft.keys : new Set(current?.permissions ?? []);
  const dirty = draft?.roleId === selectedId;
  const family = FAMILY_ROLES.includes(role?.key ?? "");

  const done = (message: string) => {
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: STAFF_PERMISSIONS_QUERY_KEY });
    toast.success(message);
  };
  const save = useMutation({
    mutationFn: () => setRoleStaffPermissions(selectedId, [...keys]),
    onSuccess: () => done(t("Staff actions saved. They apply at each user's next sign-in.")),
    onError: (e: Error) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: () => resetRoleStaffPermissions(selectedId),
    onSuccess: () => done(t("Back to the default staff actions.")),
    onError: (e: Error) => toast.error(e.message),
  });

  if (roles.isLoading || staff.isLoading) return <Skeleton className="h-64 w-full" />;
  if (staff.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {staff.error.message}
      </p>
    );

  const toggle = (key: string, on: boolean) => {
    const next = new Set(keys);
    if (on) next.add(key);
    else next.delete(key);
    setDraft({ roleId: selectedId, keys: next });
  };

  // Actions are only offered inside the modules this role can see (its Menu cell in the Permission matrix, within the school's plan).
  // An older server that doesn't say which modules the role sees shows every module, as before.
  const visibleModules = current?.modules;
  const modules = [...new Set(staff.data!.catalog.map((p) => p.module))].filter((m) => !visibleModules || visibleModules.includes(m));

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        {t("Choose what each role can do inside the modules it can see, such as issuing books or checking visitors in. Seeing a module is set in the permission matrix; an action only works while its module is on for the role. These apply to the web app and the Staff mobile app, at each user's next sign-in.")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedId}
          onValueChange={(v) => {
            setRoleId(v);
            setDraft(null);
          }}
        >
          <SelectTrigger className="w-60" aria-label={t("Role")}>
            <SelectValue placeholder={t("Choose a role")} />
          </SelectTrigger>
          <SelectContent>
            {roles.data?.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {current && <Badge variant={current.configured ? "info" : "neutral"}>{current.configured ? t("Customised for this school") : t("Using defaults")}</Badge>}
      </div>

      {family && <p className="text-sm text-muted-foreground">{t("Staff actions are only for school staff, so parents and students can't be given any.")}</p>}
      {!family && modules.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("This role can't see any module that has staff actions yet. Turn on a module's Menu cell for it in the Permission matrix and its actions will appear here.")}
        </p>
      )}

      {modules.map((module) => (
        <div key={module} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{MODULE_TITLES[module] ? t(MODULE_TITLES[module]) : module}</p>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {staff.data!.catalog
                .filter((p) => p.module === module)
                .map((p) => (
                  <label key={p.key} className="flex items-start gap-3 p-4" htmlFor={`staff-${p.key}`}>
                    <Checkbox
                      id={`staff-${p.key}`}
                      checked={!family && keys.has(p.key)}
                      disabled={family}
                      onCheckedChange={(v) => toggle(p.key, v === true)}
                      aria-label={p.label}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{p.description}</span>
                    </span>
                  </label>
                ))}
            </CardContent>
          </Card>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending || family}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("Save")}
        </Button>
        {current?.configured && (
          <Button variant="outline" onClick={() => reset.mutate()} disabled={reset.isPending}>
            <RotateCcw className="h-4 w-4" /> {t("Reset to defaults")}
          </Button>
        )}
      </div>
    </div>
  );
}
