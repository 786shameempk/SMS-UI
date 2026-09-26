import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2, PencilLine, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";
import { getTalent, reviewTalent } from "../api";
import { CATEGORY_CONFIG, VISIBILITY_CONFIG } from "../constants";
import type { TalentDecision, TalentVisibility } from "../types";
import { CreatorAvatar, CreatorTypePill, StatusBadge } from "./Bits";
import MediaShowcase from "./MediaShowcase";
import ReviewTimeline from "./ReviewTimeline";

const QUICK_FEEDBACK = [
  "Please add a short description of your work.",
  "Please remove personal details (full name, address, phone) from the media.",
  "The audio/video quality makes it hard to enjoy - could you re-record it?",
  "Please make sure everyone shown has agreed to be in it.",
  "This would be better shared as School Only.",
];

/**
 * Talent Review: the reviewer sees exactly what will be published - media, story, creator, requested
 * visibility - then approves, asks for changes, or declines, with feedback that goes straight to the creator.
 */
export default function ReviewPanel({ talentId, onClose }: { talentId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<TalentDecision>("approve");
  const [comment, setComment] = useState("");
  const [narrowToSchool, setNarrowToSchool] = useState(false);

  const { data: talent, isLoading, error } = useQuery({ queryKey: ["talents", "detail", talentId], queryFn: () => getTalent(talentId!), enabled: !!talentId });

  useEffect(() => {
    setDecision("approve");
    setComment("");
    setNarrowToSchool(false);
  }, [talentId]);

  const mutation = useMutation({
    mutationFn: () => reviewTalent(talentId!, decision, comment.trim(), decision === "approve" && narrowToSchool ? ("school_only" as TalentVisibility) : undefined),
    onSuccess: (t) => {
      queryClient.setQueryData(["talents", "detail", talentId], t);
      void queryClient.invalidateQueries({ queryKey: ["talents"] });
      toast.success(decision === "approve" ? "✅ Approved and published" : decision === "request_changes" ? "Changes requested - the creator has been notified" : "Declined - the creator has been notified");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const needsComment = decision !== "approve" && comment.trim().length === 0;
  const canAct = talent?.permissions.canReview;

  return (
    <Dialog open={!!talentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl"
        // The image lightbox is portaled outside this panel; clicking inside it must not dismiss the
        // review (the lightbox swallows its own Esc key before it reaches this panel).
        onInteractOutside={(e) => {
          if ((e.target as HTMLElement | null)?.closest("[data-cc-lightbox]")) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="cc-display text-xl">Talent review</DialogTitle>
          <DialogDescription>{talent ? `Submitted ${talent.submittedAt ? formatDateTime(talent.submittedAt) : ""}` : "Loading submission…"}</DialogDescription>
        </DialogHeader>

        {isLoading && <div className="space-y-3"><div className="aspect-video rounded-3xl cc-shimmer" /><div className="h-6 w-1/2 rounded cc-shimmer" /></div>}
        {error && <p className="text-sm text-rose-600">{(error as Error).message}</p>}

        {talent && (
          <div className="space-y-5">
            {/* Creator */}
            <div className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
              <CreatorAvatar creator={talent.creator} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{talent.creator.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CreatorTypePill type={talent.creator.type} />
                  {talent.creator.subtitle && <span className="truncate">{talent.creator.subtitle}</span>}
                  <span className="truncate">· {talent.schoolName}</span>
                </p>
              </div>
              <StatusBadge status={talent.status} />
            </div>

            {/* Content */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={cn("rounded-full px-2.5 py-1 font-medium", CATEGORY_CONFIG[talent.category].tint)}>
                  {CATEGORY_CONFIG[talent.category].emoji} {CATEGORY_CONFIG[talent.category].label}
                </span>
                <span className={cn("rounded-full px-2.5 py-1 font-medium", talent.visibility === "public" ? "bg-teal-500/12 text-teal-700 dark:text-teal-300" : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300")}>
                  Requested: {VISIBILITY_CONFIG[talent.visibility].emoji} {VISIBILITY_CONFIG[talent.visibility].label}
                </span>
                {talent.tags.map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
                    #{t}
                  </span>
                ))}
              </div>
              <h3 className="cc-display text-2xl font-bold text-foreground">{talent.title}</h3>
              <MediaShowcase talent={talent} onMeaningfulPlay={() => undefined} />
              {talent.media.length > 0 && (talent.description ? <p className="text-sm text-foreground/90 whitespace-pre-line">{talent.description}</p> : <p className="text-sm italic text-muted-foreground">No description provided.</p>)}
              <Link to={`/talents/${talent.id}`} className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-300 hover:underline">
                Open full page <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Decision */}
            {canAct ? (
              <div className="space-y-3 rounded-3xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Your decision</p>
                <div className="grid grid-cols-3 gap-2">
                  <DecisionButton active={decision === "approve"} onClick={() => setDecision("approve")} tone="emerald" icon={CheckCircle2} label="Approve" />
                  <DecisionButton active={decision === "request_changes"} onClick={() => setDecision("request_changes")} tone="orange" icon={PencilLine} label="Request changes" />
                  <DecisionButton active={decision === "reject"} onClick={() => setDecision("reject")} tone="rose" icon={XCircle} label="Decline" />
                </div>

                {decision === "approve" && talent.visibility === "public" && (
                  <label className="flex items-start gap-2.5 rounded-2xl bg-secondary/60 px-3.5 py-3 cursor-pointer">
                    <input type="checkbox" checked={narrowToSchool} onChange={(e) => setNarrowToSchool(e.target.checked)} className="mt-0.5 accent-violet-600" />
                    <span className="text-sm">
                      <span className="font-medium text-foreground">Publish as School Only instead</span>
                      <span className="block text-xs text-muted-foreground">The creator asked for Public. You can narrow it to your school - never widen it.</span>
                    </span>
                  </label>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="review-comment">{decision === "approve" ? "Note to the creator (optional)" : "Feedback for the creator (required)"}</Label>
                  <Textarea
                    id="review-comment"
                    rows={3}
                    maxLength={2000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={decision === "approve" ? "Wonderful work - keep it up! 🌟" : "Be kind and specific - what should they change?"}
                  />
                  {decision !== "approve" && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {QUICK_FEEDBACK.map((q) => (
                        <button key={q} type="button" onClick={() => setComment((c) => (c ? `${c}\n${q}` : q))} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer text-left">
                          + {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                {talent.permissions.isOwner ? "This is your own showcase - another reviewer needs to review it." : "This showcase isn't awaiting review."}
              </p>
            )}

            {talent.reviews.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Approval history</p>
                <ReviewTimeline entries={talent.reviews} />
              </div>
            )}
          </div>
        )}

        {canAct && (
          <DialogFooter>
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 h-10 text-sm cursor-pointer hover:bg-secondary">
              Cancel
            </button>
            <button
              type="button"
              disabled={needsComment || mutation.isPending}
              onClick={() => mutation.mutate()}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-5 h-10 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer",
                decision === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : decision === "request_changes" ? "bg-orange-500 hover:bg-orange-600" : "bg-rose-600 hover:bg-rose-700",
              )}
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {decision === "approve" ? "Approve & publish" : decision === "request_changes" ? "Send back for changes" : "Decline submission"}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DecisionButton({ active, onClick, tone, icon: Icon, label }: { active: boolean; onClick: () => void; tone: "emerald" | "orange" | "rose"; icon: typeof CheckCircle2; label: string }) {
  const tones = {
    emerald: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    orange: "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    rose: "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-xs font-semibold transition-all cursor-pointer", active ? tones[tone] : "border-border text-muted-foreground hover:bg-secondary")}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}
