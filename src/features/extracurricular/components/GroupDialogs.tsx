import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { applyShuffle, assignStudents, createGroupSet, listGroupHistory, listGroupMembers, listUnassigned, previewShuffle, removeFromGroup } from "../api";
import { GROUP_KIND_LABEL, SCOPE_LABEL, STRATEGY_HELP, STRATEGY_LABEL } from "../constants";
import { ColorDot, SelectField, formatDate, options, useApiMutation } from "../shared";
import type { Group, GroupKind, ShufflePreview, ShuffleScope, ShuffleStrategy } from "../types";

import { useTranslation } from "react-i18next";
// ── Create a set of groups ──────────────────────────────────────────────────

export function GroupSetDialog({ open, onOpenChange, academicYear, defaultKind }: { open: boolean; onOpenChange: (o: boolean) => void; academicYear: string; defaultKind: GroupKind }) {
  const { t } = useTranslation("extracurricular");
  const [kind, setKind] = useState<GroupKind>(defaultKind);
  const [count, setCount] = useState("4");
  const [prefix, setPrefix] = useState("House");
  const [names, setNames] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(defaultKind);
    setCount("4");
    setPrefix(defaultKind === "House" ? "House" : GROUP_KIND_LABEL[defaultKind]);
    setNames("");
    setTouched(false);
  }, [open, defaultKind]);

  const create = useApiMutation(createGroupSet, { success: (g) => `${g.length} groups created`, onSuccess: () => onOpenChange(false) });
  const n = Number(count);
  const countError = !/^\d+$/.test(count) || n < 1 || n > 50 ? "Enter a number from 1 to 50" : undefined;
  const nameList = names.split("\n").map((x) => x.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Create groups")}</DialogTitle>
          <DialogDescription>{t("For {{academicYear}}. Any number works: 4, 6, 8, 10 or your own.", { academicYear })}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (countError || !prefix.trim()) return;
            create.mutate({ kind, academicYear, count: n, namePrefix: prefix.trim(), names: names.trim() ? nameList : null });
          }}
        >
          <FormField label={t("Kind")} htmlFor="gs-kind">
            <SelectField id="gs-kind" value={kind} onChange={(v) => v && setKind(v)} items={options(GROUP_KIND_LABEL)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("How many")} htmlFor="gs-count" required error={touched ? countError : undefined}>
              <Input id="gs-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} aria-invalid={touched && countError ? true : undefined} />
            </FormField>
            <FormField label={t("Name prefix")} htmlFor="gs-prefix" required error={touched && !prefix.trim() ? "Required" : undefined} hint={t("Becomes \"House 1\", \"House 2\"…")}>
              <Input id="gs-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </FormField>
          </div>
          <FormField label={t("Or name them yourself")} htmlFor="gs-names" optional hint={t("One name per line, in order. Blank lines use the prefix.")}>
            <Textarea id="gs-names" rows={4} value={names} onChange={(e) => setNames(e.target.value)} placeholder={"Red\nBlue\nGreen\nYellow"} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t("Create")} {Number.isFinite(n) && n > 0 && !countError ? n : ""} {t("groups")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Members of one group ────────────────────────────────────────────────────

export function GroupMembersDialog({ group, onOpenChange, canManage }: { group: Group | null; onOpenChange: (o: boolean) => void; canManage: boolean }) {
  const { t } = useTranslation("extracurricular");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSearch("");
    setAdding(false);
    setPicked(new Set());
  }, [group?.id]);

  const members = useQuery({ queryKey: ["extracurricular", "group-members", group?.id], queryFn: () => listGroupMembers(group!.id), enabled: Boolean(group) });
  const unassigned = useQuery({
    queryKey: ["extracurricular", "unassigned", group?.academicYear, group?.kind, search],
    queryFn: () => listUnassigned(group!.academicYear, group!.kind, search || undefined),
    enabled: Boolean(group) && adding,
  });
  const add = useApiMutation(({ ids, override }: { ids: string[]; override: boolean }) => assignStudents(group!.id, ids, override), {
    success: (r) => `${r.assigned} added`,
    onSuccess: () => {
      setPicked(new Set());
      setAdding(false);
    },
  });
  const remove = useApiMutation(({ studentId, override }: { studentId: string; override: boolean }) => removeFromGroup(group!.id, studentId, override), { success: "Removed from the group" });

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const locked = Boolean(group?.locked);

  return (
    <Dialog open={Boolean(group)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {group && <ColorDot color={group.color} />} {group?.name}
            {locked && (
              <Badge variant="danger">
                <Lock className="me-1 h-3 w-3" /> {t("Locked")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {group && GROUP_KIND_LABEL[group.kind]} · {group?.academicYear} · {members.data?.length ?? group?.memberCount ?? 0} {t("students")}
          </DialogDescription>
        </DialogHeader>

        {!adding && (
          <>
            {members.isLoading && <Skeleton className="h-32 w-full" />}
            {members.isError && <ErrorState onRetry={() => members.refetch()} retrying={members.isFetching} />}
            {members.data && members.data.length === 0 && <EmptyState size="sm" bare title={t("No students yet")} description={canManage ? t("Add students by hand or run a shuffle.") : undefined} />}
            <ul className="divide-y divide-border rounded-lg border border-border empty:hidden">
              {members.data?.map((m) => (
                <li key={m.assignmentId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{m.studentName}</span>
                    <span className="ms-2 text-xs text-muted-foreground">{m.className}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={m.method === "Auto" ? "info" : m.method === "Override" ? "warning" : "neutral"}>{m.method === "Auto" ? t("Shuffled") : m.method === "Override" ? t("Override") : t("Manual")}</Badge>
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate({ studentId: m.studentId, override: locked })}>
                        {t("Remove")}
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {adding && (
          <div className="space-y-3">
            <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search students without a group")} aria-label={t("Search students without a group")} />
            {unassigned.isLoading && <Skeleton className="h-32 w-full" />}
            {unassigned.data && unassigned.data.length === 0 && <EmptyState size="sm" bare title={t("Everyone has a group")} description={t("Only students without a group of this kind are listed. Move others from their current group.")} />}
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border empty:hidden">
              {unassigned.data?.slice(0, 200).map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-secondary/60">
                    <Checkbox checked={picked.has(s.id)} onCheckedChange={() => toggle(s.id)} aria-label={s.name} />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.className}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          {canManage && !adding && (
            <Button type="button" onClick={() => setAdding(true)}>
              {t("Add students")}
            </Button>
          )}
          {adding && (
            <>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                {t("Back")}
              </Button>
              <Button type="button" disabled={picked.size === 0} loading={add.isPending} onClick={() => add.mutate({ ids: [...picked], override: locked })}>
                {t("Add")} {picked.size || ""} {picked.size === 1 ? t("student") : t("students")}
              </Button>
            </>
          )}
          {!adding && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shuffle ─────────────────────────────────────────────────────────────────

export function ShuffleDialog({ open, onOpenChange, groups, academicYear, kind }: { open: boolean; onOpenChange: (o: boolean) => void; groups: Group[]; academicYear: string; kind: GroupKind }) {
  const { t: tr } = useTranslation("extracurricular");
  const [strategy, setStrategy] = useState<ShuffleStrategy>("ByClass");
  const [scope, setScope] = useState<ShuffleScope>("UnassignedOnly");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<ShufflePreview | null>(null);

  useEffect(() => {
    if (open) {
      setPreview(null);
      setNote("");
    }
  }, [open]);

  const open_ = groups.filter((g) => !g.locked);
  const run = useApiMutation((seed: number | null) => previewShuffle({ academicYear, kind, strategy, scope, groupIds: open_.map((g) => g.id), seed }), {
    invalidate: [],
    onSuccess: (p) => setPreview(p),
  });
  const apply = useApiMutation(
    () => applyShuffle({ academicYear, kind, moves: preview!.moves.map((m) => ({ studentId: m.studentId, toGroupId: m.toGroupId })), note: note.trim() || null }),
    { success: "Shuffle saved", onSuccess: () => onOpenChange(false) },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" /> {tr("Shuffle {{kind}}s", { kind: GROUP_KIND_LABEL[kind].toLowerCase() })}
          </DialogTitle>
          <DialogDescription>{tr("Nothing is saved until you have seen the result and confirmed it. Every move is kept in the history.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr("How to spread students")} htmlFor="sh-strategy" hint={STRATEGY_HELP[strategy]}>
              <SelectField id="sh-strategy" value={strategy} onChange={(v) => { if (v) { setStrategy(v); setPreview(null); } }} items={options(STRATEGY_LABEL)} />
            </FormField>
            <FormField label={tr("Who to include")} htmlFor="sh-scope">
              <SelectField id="sh-scope" value={scope} onChange={(v) => { if (v) { setScope(v); setPreview(null); } }} items={options(SCOPE_LABEL)} />
            </FormField>
          </div>
          <p className="text-sm text-muted-foreground">
            {open_.length === 1 ? tr("Shuffling into {{n}} unlocked group", { n: open_.length }) : tr("Shuffling into {{n}} unlocked groups", { n: open_.length })}
            {groups.length > open_.length && tr(" ({{v1}} locked, left as they are)", { v1: groups.length - open_.length })}.
          </p>
          {open_.length === 0 && <p className="text-sm text-destructive-strong">{tr("Every group is locked. Unlock at least one to shuffle.")}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={open_.length === 0} loading={run.isPending} onClick={() => run.mutate(null)}>
              {preview ? tr("Shuffle again") : tr("Preview shuffle")}
            </Button>
            {preview && (
              <Button type="button" variant="ghost" onClick={() => run.mutate(preview.seed)} title={tr("Recompute with the same random seed")}>{tr("Recalculate (same seed {{seed}})", { seed: preview.seed })}</Button>
            )}
          </div>

          {preview && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm">
                <span className="font-medium">{preview.moves.length}</span> {tr("students would move")}
                {preview.unchanged > 0 && tr(", {{unchanged}} stay where they are", { unchanged: preview.unchanged })}
                {preview.lockedMembersKept > 0 && tr(", {{lockedMembersKept}} in locked groups are untouched", { lockedMembersKept: preview.lockedMembersKept })}.
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {preview.totals.map((t) => (
                  <li key={t.groupId} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-1.5 text-sm">
                    <span>{t.groupName}</span>
                    <span className="text-muted-foreground">
                      {t.before} → <span className="font-semibold text-foreground">{t.after}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {preview.moves.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm text-primary">{tr("See every move")}</summary>
                  <ul className="mt-2 max-h-52 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm">
                    {preview.moves.map((m) => (
                      <li key={m.studentId} className="flex items-center justify-between gap-2 px-3 py-1.5">
                        <span>
                          {m.studentName} <span className="text-xs text-muted-foreground">{m.className}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {m.fromGroupName ?? tr("no group")} → <span className="font-medium text-foreground">{m.toGroupName}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <FormField label={tr("Note for the history")} htmlFor="sh-note" optional>
                <Input id="sh-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("e.g. Start of 2026-27")} />
              </FormField>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tr("Cancel")}
          </Button>
          <Button type="button" disabled={!preview || preview.moves.length === 0} loading={apply.isPending} onClick={() => apply.mutate(undefined)}>
            {tr("Confirm and save")} {preview?.moves.length ? tr("{{length}} moves", { length: preview.moves.length }) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── History ─────────────────────────────────────────────────────────────────

export function GroupHistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation("extracurricular");
  const [page, setPage] = useState(1);
  const history = useQuery({ queryKey: ["extracurricular", "group-history", page], queryFn: () => listGroupHistory(undefined, undefined, page, 25), enabled: open, placeholderData: (p) => p });
  const total = history.data?.totalCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Assignment history")}</DialogTitle>
          <DialogDescription>{t("Every move into, out of or between groups, newest first.")}</DialogDescription>
        </DialogHeader>
        {history.isLoading && <Skeleton className="h-40 w-full" />}
        {history.isError && <ErrorState onRetry={() => history.refetch()} retrying={history.isFetching} />}
        {history.data && history.data.items.length === 0 && <EmptyState size="sm" bare title={t("No changes yet")} />}
        <ul className="divide-y divide-border rounded-lg border border-border text-sm empty:hidden">
          {history.data?.items.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-medium">{h.studentName}</span>: {h.fromGroupName ?? t("no group")} → {h.toGroupName ?? t("removed")}
              </span>
              <span className="text-xs text-muted-foreground">
                {h.reason} · {formatDate(h.at.slice(0, 10))}
                {h.by ? ` · ${h.by}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <span className="me-auto text-xs text-muted-foreground">{t("{{total}} changes", { total })}</span>
          <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("Newer")}
          </Button>
          <Button type="button" variant="outline" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>
            {t("Older")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
