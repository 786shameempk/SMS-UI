import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenText, Check, CheckCircle2, ClipboardCheck, ClipboardList, ListChecks, Loader2, Megaphone, MessageSquare, NotebookPen, Pencil, ShieldCheck,
  Sparkles, Trash2, Undo2, type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AUDIENCE_OPTIONS } from "@/features/notifications/constants";
import { cn } from "@/utils/cn";
import { CONTENT_KEY, deleteContent, getContent, listContent, transitionContent, updateContent } from "../../content/api";
import type { ContentAction, ContentItem, ContentKind, ContentStatus, ContentSummary } from "../../content/types";

const STATUS_BADGE: Record<ContentStatus, { label: string; variant: "neutral" | "info" | "warning" | "success" }> = {
  Draft: { label: "Draft", variant: "neutral" },
  Reviewed: { label: "Awaiting approval", variant: "warning" },
  Approved: { label: "Approved", variant: "info" },
  Published: { label: "Published", variant: "success" },
};

/** The one path content takes, in order. */
const STEPS: ContentStatus[] = ["Draft", "Reviewed", "Approved", "Published"];

const KIND: Record<ContentKind, { label: string; icon: LucideIcon }> = {
  Notice: { label: "Notice", icon: Megaphone },
  Message: { label: "Message", icon: MessageSquare },
  LessonPlan: { label: "Lesson plan", icon: BookOpenText },
  Worksheet: { label: "Worksheet", icon: ClipboardList },
  QuestionSet: { label: "Question set", icon: ListChecks },
  Homework: { label: "Homework", icon: NotebookPen },
};

const ACTION: Record<ContentAction, { label: string; icon: LucideIcon; variant: "default" | "outline" }> = {
  MarkReviewed: { label: "Mark reviewed", icon: ClipboardCheck, variant: "default" },
  Approve: { label: "Approve", icon: CheckCircle2, variant: "default" },
  SendBack: { label: "Send back", icon: Undo2, variant: "outline" },
  Publish: { label: "Publish", icon: Megaphone, variant: "default" },
};

const HISTORY_LABEL: Record<string, string> = {
  Created: "Created",
  Edited: "Edited",
  MarkReviewed: "Marked reviewed",
  Approve: "Approved",
  SendBack: "Sent back",
  Publish: "Published",
};

type Filter = "queue" | "approved" | "drafts" | "published" | "mine";

const FILTERS: { value: Filter; label: string; params: Parameters<typeof listContent>[0]; empty: { title: string; description: string } }[] = [
  { value: "queue", label: "Awaiting approval", params: { status: "Reviewed" }, empty: { title: "Nothing waiting for approval", description: "Content marked as reviewed shows up here for an administrator to approve or send back." } },
  { value: "approved", label: "Approved", params: { status: "Approved" }, empty: { title: "No approved content", description: "Approved items wait here until someone publishes them." } },
  { value: "drafts", label: "Drafts", params: { status: "Draft" }, empty: { title: "No drafts", description: "Save an AI draft for review from the Content Assistant or Teacher Tools and it starts here." } },
  { value: "published", label: "Published", params: { status: "Published" }, empty: { title: "Nothing published yet", description: "Published notices, lesson plans and other content are listed here for reference." } },
  { value: "mine", label: "Mine", params: { mine: true }, empty: { title: "You haven't saved anything for review", description: "Content you save for review appears here, whatever stage it is at." } },
];

const audienceLabel = (a: string | null) => AUDIENCE_OPTIONS.find((o) => o.value === a)?.label ?? a ?? "";

function timeAgo(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000]];
  for (const [unit, ms] of units) if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  return "just now";
}

/** What this person can do with an item right now, in words (the server decides; this only labels it). */
function nextStep(item: ContentSummary): string | null {
  if (item.allowedActions.includes("Approve")) return "Ready to approve";
  if (item.allowedActions.includes("Publish")) return "Ready to publish";
  if (item.status === "Draft" && item.allowedActions.includes("MarkReviewed")) return "Ready to review";
  return null;
}

/** Draft → Awaiting approval → Approved → Published. With a status it marks progress; without one it just shows the path. */
function Stepper({ status, className }: { status?: ContentStatus; className?: string }) {
  const current = status ? STEPS.indexOf(status) : -1;
  return (
    <ol aria-label="Review steps" className={cn("flex items-center gap-1.5 text-xs", className)}>
      {STEPS.map((step, i) => {
        const done = i < current || status === "Published";
        const active = i === current && status !== "Published";
        return (
          <li key={step} aria-current={active ? "step" : undefined} className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-inset",
                done && "bg-success text-success-foreground ring-success",
                active && "bg-primary text-primary-foreground ring-primary",
                !done && !active && "bg-secondary text-muted-foreground ring-border",
              )}
              aria-hidden="true"
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={cn("truncate font-medium", active ? "text-foreground" : done ? "text-secondary-foreground" : "text-muted-foreground")}>
              {STATUS_BADGE[step].label}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className={cn("h-px w-4 shrink-0 sm:w-8", i < current ? "bg-success" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Review & Publish: content (often AI drafts) moves Draft → Reviewed → Approved → Published. The buttons shown are the
 * actions the server says this user may take now; the server checks them again (and the version) on every click.
 */
export default function ContentReviewTab() {
  const [filter, setFilter] = useState<Filter>("queue");
  const [openId, setOpenId] = useState<string | null>(null);
  const current = FILTERS.find((f) => f.value === filter)!;
  const list = useQuery({ queryKey: [...CONTENT_KEY, filter], queryFn: () => listContent(current.params) });
  // Everything, only to put a count on each filter.
  const everything = useQuery({ queryKey: [...CONTENT_KEY, "counts"], queryFn: () => listContent({}) });
  const count = (f: Filter): number | undefined => {
    if (!everything.data) return undefined;
    if (f === "mine") return everything.data.filter((i) => i.isMine).length;
    return everything.data.filter((i) => i.status === FILTERS.find((x) => x.value === f)!.params?.status).length;
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-inset ring-primary/20">
            <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Drafts are checked by their author, approved by an administrator, then published. Nothing reaches parents or students before it is approved, and every
            step is recorded.
          </p>
        </div>
        <Stepper className="flex-wrap pl-12" />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} count={count(f.value)}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.isLoading && (
        <div className="space-y-2" role="status" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      )}
      {list.isError && <ErrorState size="sm" title="We couldn't load this list" onRetry={() => void list.refetch()} retrying={list.isFetching} />}
      {list.data?.length === 0 && <EmptyState icon={KIND.Notice.icon} title={current.empty.title} description={current.empty.description} />}

      <div className="space-y-2">
        {list.data?.map((item: ContentSummary) => {
          const { icon: KindIcon, label: kindLabel } = KIND[item.kind];
          const next = nextStep(item);
          return (
            <Card key={item.id} className="transition-colors hover:border-primary/40">
              <CardContent className="flex flex-col gap-3 p-3.5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground ring-1 ring-inset ring-border">
                    <KindIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabel} · {item.isMine ? "you" : item.createdByRole} · <time dateTime={item.updatedAt} title={new Date(item.updatedAt).toLocaleString()}>{timeAgo(item.updatedAt)}</time>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                  {next && <span className="text-xs font-medium text-primary-text">{next}</span>}
                  {item.aiGenerated && (
                    <Badge variant="neutral">
                      <Sparkles className="h-3 w-3" /> AI
                    </Badge>
                  )}
                  <Badge variant={STATUS_BADGE[item.status].variant} dot>
                    {STATUS_BADGE[item.status].label}
                  </Badge>
                  <Button size="sm" variant={next ? "default" : "outline"} onClick={() => setOpenId(item.id)}>
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {openId && <ContentDialog id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ContentDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: [...CONTENT_KEY, "item", id], queryFn: () => getContent(id) });
  const [edit, setEdit] = useState<{ title: string; body: string } | null>(null);
  const [pending, setPending] = useState<ContentAction | null>(null);
  const [comment, setComment] = useState("");

  const refresh = (item?: ContentItem) => {
    if (item) queryClient.setQueryData([...CONTENT_KEY, "item", id], item);
    queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
  };

  const save = useMutation({
    mutationFn: (item: ContentItem) => updateContent(id, { version: item.version, title: edit!.title, body: edit!.body }),
    onSuccess: (item) => {
      setEdit(null);
      refresh(item);
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const act = useMutation({
    mutationFn: ({ item, action }: { item: ContentItem; action: ContentAction }) => transitionContent(id, action, item.version, comment.trim() || undefined),
    onSuccess: (item, { action }) => {
      setPending(null);
      setComment("");
      refresh(item);
      toast.success(action === "Publish" ? "Published" : `${ACTION[action].label}: done`);
    },
    // A stale version (409) means someone else acted: reload so the user sees the current state.
    onError: (e: Error) => {
      toast.error(e.message);
      void detail.refetch();
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
      toast.success("Draft deleted");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const item = detail.data;
  const needsConfirm = pending === "Publish" || pending === "SendBack";
  const KindIcon = item ? KIND[item.kind].icon : Megaphone;
  // A draft that was just sent back carries the reviewer's reason; show it above the text so the author sees what to fix.
  const lastEntry = item?.history[item.history.length - 1];
  const changesRequested = item?.status === "Draft" && lastEntry?.action === "SendBack" && lastEntry.comment ? lastEntry.comment : null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-inset ring-primary/20">
              <KindIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1 text-left">
              <DialogTitle className="truncate">{item?.title ?? "Content"}</DialogTitle>
              <DialogDescription>
                {item ? (
                  <>
                    {KIND[item.kind].label}
                    {item.audience ? ` for ${audienceLabel(item.audience)}` : ""} · {STATUS_BADGE[item.status].label}
                    {item.aiGenerated ? " · first drafted by AI" : ""}
                  </>
                ) : (
                  "Loading…"
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {detail.isError && <ErrorState size="sm" bare title="We couldn't open this item" onRetry={() => void detail.refetch()} retrying={detail.isFetching} />}
        {detail.isLoading && <Skeleton className="h-40 w-full rounded-lg" />}

        {item && (
          <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            <Stepper status={item.status} className="flex-wrap" />

            {changesRequested && (
              <div role="note" className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning-strong">
                <Undo2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Changes requested</p>
                  <p>{changesRequested}</p>
                </div>
              </div>
            )}

            {edit ? (
              <div className="space-y-3">
                <FormField label="Title" htmlFor="content-title">
                  <Input id="content-title" value={edit.title} maxLength={200} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                </FormField>
                <FormField label="Content" htmlFor="content-body">
                  <Textarea id="content-body" rows={10} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                </FormField>
                <div className="flex gap-2">
                  <Button onClick={() => save.mutate(item)} disabled={save.isPending || !edit.title.trim() || !edit.body.trim()}>
                    {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </Button>
                  <Button variant="outline" onClick={() => setEdit(null)} disabled={save.isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-4 text-sm leading-6 text-foreground">{item.body}</div>
            )}

            {pending && needsConfirm && (
              <div className="space-y-3 rounded-lg border border-border bg-card p-3.5 shadow-xs">
                {pending === "Publish" ? (
                  <p className="text-sm">
                    {item.kind === "Notice"
                      ? `This posts the notice to ${audienceLabel(item.audience)} now, including a push notification on their phones.`
                      : item.kind === "LessonPlan"
                        ? "This files it as a published plan in the Lesson Plans module, under the teacher who wrote it."
                        : "This publishes it to the school's content library."}
                  </p>
                ) : (
                  <FormField label="What needs to change?" htmlFor="content-comment">
                    <Textarea id="content-comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
                  </FormField>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => act.mutate({ item, action: pending })} disabled={act.isPending || (pending === "SendBack" && !comment.trim())}>
                    {act.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm {ACTION[pending].label.toLowerCase()}
                  </Button>
                  <Button variant="outline" onClick={() => setPending(null)} disabled={act.isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <section aria-label="History">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h4>
              <ol className="mt-2 ml-1.5 space-y-3 border-l border-border pl-4">
                {item.history.map((h, i) => (
                  <li key={i} className="relative text-sm text-secondary-foreground">
                    <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />
                    <span className="font-medium text-foreground">{HISTORY_LABEL[h.action] ?? h.action}</span> by {h.actorRole} ·{" "}
                    <time dateTime={h.at} className="text-muted-foreground">{new Date(h.at).toLocaleString()}</time>
                    {h.comment && <span className="mt-0.5 block rounded-md bg-secondary/50 px-2.5 py-1.5 text-muted-foreground">“{h.comment}”</span>}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}

        {item && !edit && (
          <DialogFooter className="flex-wrap gap-2 border-t border-border pt-4 sm:justify-between">
            <div className="flex gap-2">
              {item.canEdit && (
                <Button variant="outline" onClick={() => setEdit({ title: item.title, body: item.body })}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
              {item.canEdit && (
                <Button variant="ghost" className="text-destructive-strong hover:text-destructive-strong" onClick={() => remove.mutate()} disabled={remove.isPending}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {item.allowedActions.map((a) => {
                const { label, icon: Icon, variant } = ACTION[a];
                const direct = a === "MarkReviewed" || a === "Approve";
                return (
                  <Button key={a} variant={variant} disabled={act.isPending} onClick={() => (direct ? act.mutate({ item, action: a }) : setPending(a))}>
                    {act.isPending && act.variables?.action === a ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                    {label}
                  </Button>
                );
              })}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
