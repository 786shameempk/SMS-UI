import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AI_PERMISSIONS_QUERY_KEY, getAiPermissions, listRoles, resetRoleAiPermissions, setRoleAiPermissions } from "../api";

const FAMILY_ROLES = ["parent", "student"];

/**
 * Which AI features each role gets in this school (the AI.* permissions AiService checks). Roles start with sensible
 * defaults; saving makes the ticked list exact. Applies at each user's next sign-in. Staff-only features can never be
 * given to parents or students (the server refuses too).
 */
export default function AiPermissionsTab() {
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });
  const ai = useQuery({ queryKey: AI_PERMISSIONS_QUERY_KEY, queryFn: getAiPermissions });
  const [roleId, setRoleId] = useState<string>("");
  const [draft, setDraft] = useState<{ roleId: string; keys: Set<string> } | null>(null);

  const selectedId = roleId || roles.data?.[0]?.id || "";
  const role = roles.data?.find((r) => r.id === selectedId);
  const current = ai.data?.roles.find((r) => r.roleId === selectedId);
  const keys = draft?.roleId === selectedId ? draft.keys : new Set(current?.permissions ?? []);
  const dirty = draft?.roleId === selectedId;
  const family = FAMILY_ROLES.includes(role?.key ?? "");

  const done = (message: string) => {
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: AI_PERMISSIONS_QUERY_KEY });
    toast.success(message);
  };
  const save = useMutation({
    mutationFn: () => setRoleAiPermissions(selectedId, [...keys]),
    onSuccess: () => done("AI permissions saved. They apply at each user's next sign-in."),
    onError: (e: Error) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: () => resetRoleAiPermissions(selectedId),
    onSuccess: () => done("Back to the default AI permissions."),
    onError: (e: Error) => toast.error(e.message),
  });

  if (roles.isLoading || ai.isLoading) return <Skeleton className="h-64 w-full" />;
  if (ai.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {ai.error.message}
      </p>
    );

  const toggle = (key: string, on: boolean) => {
    const next = new Set(keys);
    if (on) next.add(key);
    else next.delete(key);
    setDraft({ roleId: selectedId, keys: next });
  };

  const groups = [
    { title: "For everyone", items: ai.data!.catalog.filter((p) => !p.staffOnly) },
    { title: "Staff only", items: ai.data!.catalog.filter((p) => p.staffOnly) },
  ];

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Choose which AI features each role can use. The &ldquo;AI Features&rdquo; module must also be on for the role in the permission matrix. Changes apply at
        each user&apos;s next sign-in.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedId}
          onValueChange={(v) => {
            setRoleId(v);
            setDraft(null);
          }}
        >
          <SelectTrigger className="w-60" aria-label="Role">
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.data?.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {current && <Badge variant={current.configured ? "info" : "neutral"}>{current.configured ? "Customised for this school" : "Using defaults"}</Badge>}
      </div>

      {groups.map((g) => (
        <div key={g.title} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.title}</p>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {g.items.map((p) => {
                const blocked = family && p.staffOnly;
                return (
                  <label key={p.key} className="flex items-start gap-3 p-4" htmlFor={`ai-${p.key}`}>
                    <Checkbox
                      id={`ai-${p.key}`}
                      checked={!blocked && keys.has(p.key)}
                      disabled={blocked}
                      onCheckedChange={(v) => toggle(p.key, v === true)}
                      aria-label={p.label}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{blocked ? "Only for school staff." : p.description}</span>
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </Button>
        {current?.configured && (
          <Button variant="outline" onClick={() => reset.mutate()} disabled={reset.isPending}>
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
        )}
      </div>
    </div>
  );
}
