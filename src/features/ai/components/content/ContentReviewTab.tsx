import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, FileText, Loader2, Megaphone, Sparkles, Trash2, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AUDIENCE_OPTIONS } from "@/features/notifications/constants";
import { CONTENT_KEY, deleteContent, getContent, listContent, transitionContent, updateContent } from "../../content/api";
import type { ContentAction, ContentItem, ContentKind, ContentStatus, ContentSummary } from "../../content/types";

const STATUS_BADGE: Record<ContentStatus, { label: string; variant: "neutral" | "info" | "warning" | "success" }> = {
  Draft: { label: "Draft", variant: "neutral" },
  Reviewed: { label: "Awaiting approval", variant: "warning" },
  Approved: { label: "Approved", variant: "info" },
  Published: { label: "Published", variant: "success" },
};

const KIND_LABEL: Record<ContentKind, string> = {
  Notice: "Notice",
  Message: "Message",
  LessonPlan: "Lesson plan",
  Worksheet: "Worksheet",
  QuestionSet: "Question set",
  Homework: "Homework",
};

const ACTION: Record<ContentAction, { label: string; icon: typeof CheckCircle2; variant: "default" | "outline" }> = {
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

const FILTERS: { value: Filter; label: string; params: Parameters<typeof listContent>[0] }[] = [
  { value: "queue", label: "Awaiting approval", params: { status: "Reviewed" } },
  { value: "approved", label: "Approved", params: { status: "Approved" } },
  { value: "drafts", label: "Drafts", params: { status: "Draft" } },
  { value: "published", label: "Published", params: { status: "Published" } },
  { value: "mine", label: "Mine", params: { mine: true } },
];

const audienceLabel = (a: string | null) => AUDIENCE_OPTIONS.find((o) => o.value === a)?.label ?? a ?? "";

/**
 * Review & Publish: content (often AI drafts) moves Draft → Reviewed → Approved → Published. The buttons shown are the
 * actions the server says this user may take now; the server checks them again (and the version) on every click.
 */
export default function ContentReviewTab() {
  const [filter, setFilter] = useState<Filter>("queue");
  const [openId, setOpenId] = useState<string | null>(null);
  const params = FILTERS.find((f) => f.value === filter)!.params;
  const list = useQuery({ queryKey: [...CONTENT_KEY, filter], queryFn: () => listContent(params) });

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Drafts are checked by their author, approved by an administrator, then published. Nothing reaches parents or students before it is approved, and every
        step is recorded.
      </p>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {list.isError && (
        <p role="alert" className="text-sm text-destructive">
          {list.error.message}
        </p>
      )}
      {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}

      <div className="space-y-2">
        {list.data?.map((item: ContentSummary) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABEL[item.kind]} · {item.isMine ? "you" : item.createdByRole} · {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.aiGenerated && (
                  <Badge variant="neutral">
                    <Sparkles className="h-3 w-3" /> AI
                  </Badge>
                )}
                <Badge variant={STATUS_BADGE[item.status].variant}>{STATUS_BADGE[item.status].label}</Badge>
                <Button size="sm" variant="outline" onClick={() => setOpenId(item.id)}>
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item?.title ?? "Content"}</DialogTitle>
          <DialogDescription>
            {item ? (
              <>
                {KIND_LABEL[item.kind]}
                {item.audience ? ` for ${audienceLabel(item.audience)}` : ""} · {STATUS_BADGE[item.status].label}
                {item.aiGenerated ? " · first drafted by AI" : ""}
              </>
            ) : (
              "Loading…"
            )}
          </DialogDescription>
        </DialogHeader>

        {detail.isError && (
          <p role="alert" className="text-sm text-destructive">
            {detail.error.message}
          </p>
        )}

        {item && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
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
              <div className="whitespace-pre-wrap rounded-md border border-border bg-secondary/30 p-3 text-sm text-foreground">{item.body}</div>
            )}

            {pending && needsConfirm && (
              <div className="space-y-2 rounded-md border border-border p-3">
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
              <ol className="mt-1 space-y-1 text-sm">
                {item.history.map((h, i) => (
                  <li key={i} className="text-secondary-foreground">
                    <span className="font-medium text-foreground">{HISTORY_LABEL[h.action] ?? h.action}</span> by {h.actorRole} · {new Date(h.at).toLocaleString()}
                    {h.comment && <span className="block pl-3 text-muted-foreground">“{h.comment}”</span>}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}

        {item && !edit && (
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2">
              {item.canEdit && (
                <Button variant="outline" onClick={() => setEdit({ title: item.title, body: item.body })}>
                  Edit
                </Button>
              )}
              {item.canEdit && (
                <Button variant="ghost" onClick={() => remove.mutate()} disabled={remove.isPending}>
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
