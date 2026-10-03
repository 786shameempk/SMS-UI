import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, Copy, Languages as LanguagesIcon, Loader2, Megaphone, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { postAnnouncement } from "@/features/notifications/api";
import { AUDIENCE_OPTIONS } from "@/features/notifications/constants";
import type { AnnouncementAudience } from "@/features/notifications/types";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "../../capabilities";
import { draftNotice, rewriteContent } from "../../notices/api";
import { CONTENT_KEY, createContent } from "../../content/api";
import type { CommunicationKind, NoticeDraft, NoticeTone, RewriteAction } from "../../notices/types";

const KINDS: { value: CommunicationKind; label: string }[] = [
  { value: "Notice", label: "Notice" },
  { value: "ParentMessage", label: "Parent message" },
  { value: "StudentMessage", label: "Student message" },
  { value: "Announcement", label: "Announcement" },
  { value: "Circular", label: "Circular" },
];

const EXAMPLES = ["Create a notice about tomorrow's holiday.", "Inform parents that the exam has been postponed.", "Remind parents about pending fees."];

type Version = "content" | "shortVersion" | "formalVersion";

const REWRITES: { action: Exclude<RewriteAction, "Translate">; label: string }[] = [
  { action: "ImproveGrammar", label: "Improve grammar" },
  { action: "MoreFormal", label: "More formal" },
  { action: "Friendlier", label: "Friendlier" },
  { action: "MoreConcise", label: "More concise" },
];

/** Roles allowed to post school-wide announcements from here. */
const POSTING_ROLES = ["admin", "superAdmin", "principal"];

function Field({ label, children, htmlFor }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <FormField label={label} htmlFor={htmlFor}>
      {children}
    </FormField>
  );
}

/**
 * AI notice / message drafter: a short instruction becomes a title plus content, short and formal versions. Every
 * version stays editable; rewrite and translate act on the version on screen. Nothing is sent without a person.
 */
export default function NoticeDrafter() {
  const role = useAuthStore((s) => s.user?.role);
  const { languages, can } = useAiCapabilities();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<CommunicationKind>("Notice");
  const [tone, setTone] = useState<NoticeTone>("Neutral");
  const [language, setLanguage] = useState("English");
  const [audience, setAudience] = useState("");
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<NoticeDraft | null>(null);
  const [version, setVersion] = useState<Version>("content");
  const [translateTo, setTranslateTo] = useState("");
  const [copied, setCopied] = useState(false);
  /** The audience dialog: posting now (admins) or submitting for approval (anyone who drafts). */
  const [posting, setPosting] = useState<"post" | "submit" | null>(null);
  const [postAudience, setPostAudience] = useState<AnnouncementAudience>("everyone");

  const generate = useMutation({
    mutationFn: () => draftNotice({ kind, instruction: instruction.trim(), tone, language, audience: audience.trim() || undefined }),
    onSuccess: (r) => {
      setDraft(r.content);
      setVersion("content");
    },
  });

  const rewrite = useMutation({
    mutationFn: (v: { action: RewriteAction; language?: string }) => rewriteContent({ text: draft![version], action: v.action, language: v.language }),
    onSuccess: (r) => setDraft((d) => (d ? { ...d, [version]: r.content.text } : d)),
    onError: (e: Error) => toast.error(e.message),
  });

  const post = useMutation({
    mutationFn: () => postAnnouncement({ title: draft!.title, body: draft![version], category: "announcement", audience: postAudience }),
    onSuccess: () => {
      toast.success("Announcement posted");
      setPosting(null);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isMessage = kind === "ParentMessage" || kind === "StudentMessage";
  const submit = useMutation({
    mutationFn: () =>
      createContent({
        kind: isMessage ? "Message" : "Notice",
        title: draft!.title.trim(),
        body: draft![version].trim(),
        audience: isMessage ? null : postAudience,
        aiGenerated: true,
        sourceFeature: "generate-notification",
      }),
    onSuccess: () => {
      toast.success("Saved for review. Track it under Review & Publish.");
      setPosting(null);
      queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const text = draft?.[version] ?? "";
  const busy = generate.isPending || rewrite.isPending;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${draft?.title}\n\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy is blocked here. Select the text and copy it instead.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Draft a notice or message with AI
        </CardTitle>
        <CardDescription>Describe what you want to say. The AI writes it; you edit and decide what is sent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type" htmlFor="notice-kind">
            <Select value={kind} onValueChange={(v) => setKind(v as CommunicationKind)}>
              <SelectTrigger id="notice-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tone" htmlFor="notice-tone">
            <Select value={tone} onValueChange={(v) => setTone(v as NoticeTone)}>
              <SelectTrigger id="notice-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Neutral">Neutral</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Formal">Formal</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Language" htmlFor="notice-language">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="notice-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <FormField label="Audience" htmlFor="notice-audience" optional hint="e.g. Parents of Grade 8. Leave empty to use the type's usual audience.">
          <Input id="notice-audience" value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={100} />
        </FormField>
        <FormField label="What should it say?" htmlFor="notice-instruction" hint="Include the dates, times and amounts you want in it. Anything missing becomes a [placeholder].">
          <Textarea id="notice-instruction" rows={3} maxLength={1500} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={EXAMPLES[0]} />
        </FormField>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <Button key={e} type="button" size="sm" variant="ghost" onClick={() => setInstruction(e)}>
              {e}
            </Button>
          ))}
        </div>
        <Button onClick={() => generate.mutate()} disabled={!instruction.trim() || busy}>
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {draft ? "Draft again" : "Draft with AI"}
        </Button>
        {generate.isError && (
          <p role="alert" className="text-sm text-destructive">
            {generate.error.message}
          </p>
        )}

        {draft && (
          <div className="space-y-3 rounded-lg border border-border p-4" aria-label="AI draft">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" dot>
                <Sparkles className="mr-1 h-3 w-3" /> AI draft
              </Badge>
              <Badge variant="warning" dot>
                Review before sending
              </Badge>
            </div>
            <FormField label="Title" htmlFor="notice-title">
              <Input id="notice-title" value={draft.title} maxLength={200} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </FormField>
            <Tabs value={version} onValueChange={(v) => setVersion(v as Version)}>
              <TabsList>
                <TabsTrigger value="content">Full</TabsTrigger>
                <TabsTrigger value="shortVersion">Short</TabsTrigger>
                <TabsTrigger value="formalVersion">Formal</TabsTrigger>
              </TabsList>
            </Tabs>
            <Textarea aria-label="Notice text" rows={version === "shortVersion" ? 3 : 8} value={text} maxLength={4000} onChange={(e) => setDraft({ ...draft, [version]: e.target.value })} disabled={rewrite.isPending} />
            <div className="flex flex-wrap items-center gap-1.5">
              {REWRITES.map((r) => (
                <Button key={r.action} type="button" size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => rewrite.mutate({ action: r.action })}>
                  <Wand2 className="h-3.5 w-3.5" /> {r.label}
                </Button>
              ))}
              {can("translate") && (
                <span className="flex items-center gap-1.5">
                  <Select value={translateTo} onValueChange={setTranslateTo}>
                    <SelectTrigger className="h-8 w-36" aria-label="Translate into">
                      <SelectValue placeholder="Translate to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" disabled={busy || !translateTo || !text.trim()} onClick={() => rewrite.mutate({ action: "Translate", language: translateTo })}>
                    <LanguagesIcon className="h-3.5 w-3.5" /> Translate
                  </Button>
                </span>
              )}
              {rewrite.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Rewriting" />}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              {can("author-content") && (
                <Button type="button" variant="outline" onClick={() => (isMessage ? submit.mutate() : setPosting("submit"))} disabled={busy || submit.isPending || !draft.title.trim() || !text.trim()}>
                  {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Submit for approval
                </Button>
              )}
              {role && POSTING_ROLES.includes(role) && (
                <Button type="button" onClick={() => setPosting("post")} disabled={busy || !draft.title.trim() || !text.trim()}>
                  <Megaphone className="h-4 w-4" /> Post as announcement
                </Button>
              )}
            </div>
            {text.includes("[") && <p className="text-xs text-warning-strong">Fill in the [placeholders] before sending.</p>}
          </div>
        )}
      </CardContent>

      <Dialog open={posting !== null} onOpenChange={(v) => !post.isPending && !submit.isPending && !v && setPosting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{posting === "submit" ? "Submit for approval" : "Post announcement"}</DialogTitle>
            <DialogDescription>
              {posting === "submit"
                ? "An administrator reviews and approves it before it is published to the audience you choose. Nothing is sent yet."
                : "It appears in the notifications of everyone in the audience you choose, and as a push notification on their phones."}
            </DialogDescription>
          </DialogHeader>
          <FormField label="Send to" htmlFor="post-audience">
            <Select value={postAudience} onValueChange={(v) => setPostAudience(v as AnnouncementAudience)}>
              <SelectTrigger id="post-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
            <p className="font-medium">{draft?.title}</p>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted-foreground">{text}</p>
          </div>
          {text.includes("[") && <p className="text-sm text-destructive">This text still has [placeholders]. Fill them in first.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosting(null)} disabled={post.isPending || submit.isPending}>
              Cancel
            </Button>
            {posting === "submit" ? (
              <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                Submit
              </Button>
            ) : (
              <Button onClick={() => post.mutate()} disabled={post.isPending || text.includes("[")}>
                {post.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                Post
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
