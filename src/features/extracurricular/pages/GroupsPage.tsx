import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Lock, Plus, Shuffle, Trash2, Unlock, Users } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { deleteGroup, listGroups, setGroupsLocked } from "../api";
import { GroupDialogs } from "../components/GroupDialogsBundle";
import { GROUP_KIND_LABEL } from "../constants";
import { ColorDot, SelectField, options, useAcademicYears, useApiMutation, useExtracurricularAccess } from "../shared";
import type { Group, GroupKind } from "../types";

export default function GroupsPage() {
  const access = useExtracurricularAccess();
  const years = useAcademicYears();
  const [year, setYear] = useState<string | undefined>();
  const [kind, setKind] = useState<GroupKind>("House");
  const academicYear = year ?? years.current;
  const [dialog, setDialog] = useState<"create" | "shuffle" | "history" | null>(null);
  const [viewing, setViewing] = useState<Group | null>(null);
  const [removing, setRemoving] = useState<Group | null>(null);

  const groups = useQuery({ queryKey: ["extracurricular", "groups", academicYear, kind], queryFn: () => listGroups(academicYear, kind) });
  const lock = useApiMutation(({ ids, locked }: { ids: string[]; locked: boolean }) => setGroupsLocked(ids, locked), { success: (r) => `${r.changed} groups updated` });
  const remove = useApiMutation(deleteGroup, { success: "Group deleted", onSuccess: () => setRemoving(null) });

  const list = groups.data ?? [];
  const total = list.reduce((n, g) => n + g.memberCount, 0);
  const max = Math.max(1, ...list.map((g) => g.memberCount));
  const allLocked = list.length > 0 && list.every((g) => g.locked);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <SelectField value={kind} onChange={(v) => v && setKind(v)} items={options(GROUP_KIND_LABEL)} />
        </div>
        <div className="w-32">
          <SelectField value={academicYear} onChange={setYear} items={years.names.map((n) => ({ value: n, label: n }))} />
        </div>
        <p className="text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "group" : "groups"} · {total} students
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog("history")}>
            <History className="h-4 w-4" /> History
          </Button>
          {access.canManage && (
            <>
              <Button variant="outline" disabled={list.length === 0} onClick={() => lock.mutate({ ids: list.map((g) => g.id), locked: !allLocked })}>
                {allLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />} {allLocked ? "Unlock all" : "Lock all"}
              </Button>
              <Button variant="outline" disabled={list.length === 0} onClick={() => setDialog("shuffle")}>
                <Shuffle className="h-4 w-4" /> Shuffle students
              </Button>
              <Button onClick={() => setDialog("create")}>
                <Plus className="h-4 w-4" /> Create groups
              </Button>
            </>
          )}
        </div>
      </div>

      {groups.isError && <ErrorState onRetry={() => groups.refetch()} retrying={groups.isFetching} />}
      {groups.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}
      {groups.data && list.length === 0 && (
        <EmptyState
          icon={Users}
          title={`No ${GROUP_KIND_LABEL[kind].toLowerCase()}s for ${academicYear}`}
          description={access.canManage ? "Create as many as the school needs, then place students by hand or with a shuffle." : "The school has not set these up yet."}
          action={access.canManage ? <Button onClick={() => setDialog("create")}><Plus className="h-4 w-4" /> Create groups</Button> : undefined}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((g) => (
          <Card key={g.id} className="overflow-hidden" style={{ borderTop: `4px solid ${g.color}` }}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-base font-semibold">
                    <ColorDot color={g.color} /> {g.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{g.code}</p>
                </div>
                {g.locked && (
                  <Badge variant="danger">
                    <Lock className="mr-1 h-3 w-3" /> Locked
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-2xl font-semibold">{g.memberCount}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${(100 * g.memberCount) / max}%`, backgroundColor: g.color }} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-1">
                <Button size="sm" variant="outline" onClick={() => setViewing(g)}>
                  <Users className="h-3.5 w-3.5" /> Members
                </Button>
                {access.canManage && (
                  <div className="flex">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={g.locked ? `Unlock ${g.name}` : `Lock ${g.name}`} onClick={() => lock.mutate({ ids: [g.id], locked: !g.locked })}>
                      {g.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${g.name}`} onClick={() => setRemoving(g)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive-strong" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <GroupDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        academicYear={academicYear}
        kind={kind}
        groups={list}
        viewing={viewing}
        onCloseMembers={() => setViewing(null)}
        canManage={access.canManage}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Delete group"
        description={`Delete "${removing?.name}"? A group that still has members can't be deleted.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
      />
    </div>
  );
}
