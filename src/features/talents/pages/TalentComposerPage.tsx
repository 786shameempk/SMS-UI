import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { createTalent, deleteTalentMedia, getTalent, getTalentSettings, submitTalent, updateTalent, uploadTalentMedia } from "../api";
import { CATEGORY_CONFIG, VISIBILITY_CONFIG } from "../constants";
import { useTalentRole } from "../hooks";
import { CategoryPicker, VisibilityPicker } from "../components/ComposerPickers";
import { EmptyState } from "../components/Bits";
import { HeroDecor } from "../components/Decor";
import MediaDropzone from "../components/MediaDropzone";
import { type ComposerMedia, stageFiles } from "../media";
import type { TalentFormValues } from "../types";

const STEPS = [
  { title: "Your talent", hint: "What are you sharing?" },
  { title: "Media", hint: "Photos, videos or recordings" },
  { title: "Visibility & submit", hint: "Who can see it" },
];

const EMPTY: TalentFormValues = { title: "", description: "", category: "art", tags: [], visibility: "school_only" };

export default function TalentComposerPage() {
  const { id } = useParams<{ id: string }>();
  const editing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canCreate, creatorSubtitle, user } = useTalentRole();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<TalentFormValues>(EMPTY);
  const [tagDraft, setTagDraft] = useState("");
  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const [removedServerIds, setRemovedServerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState<null | "draft" | "submit">(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Once a new draft exists server-side, retries after a failed upload reuse it instead of creating another.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const hydrated = useRef(false);

  const { data: existing, isLoading } = useQuery({ queryKey: ["talents", "detail", id], queryFn: () => getTalent(id!), enabled: editing });
  const { data: settings } = useQuery({ queryKey: ["talents", "settings"], queryFn: getTalentSettings, retry: false });
  const isStudent = user?.role === "student";
  const publicAllowed = settings ? (isStudent ? settings.allowStudentPublic : settings.allowTeacherPublic) : true;

  useEffect(() => {
    if (!existing || hydrated.current) return;
    hydrated.current = true;
    setValues({ title: existing.title, description: existing.description ?? "", category: existing.category, tags: existing.tags, visibility: existing.visibility });
    setMedia(
      existing.media.map((m) => ({
        key: m.id,
        serverId: m.id,
        type: m.type,
        previewUrl: m.url,
        name: m.fileName,
        sizeBytes: m.sizeBytes,
        caption: m.caption ?? "",
        durationSeconds: m.durationSeconds,
      })),
    );
  }, [existing]);

  useEffect(() => {
    if (!publicAllowed && values.visibility === "public") setValues((v) => ({ ...v, visibility: "school_only" }));
  }, [publicAllowed, values.visibility]);

  // Free local object URLs when leaving.
  const mediaRef = useRef(media);
  mediaRef.current = media;
  useEffect(() => () => mediaRef.current.forEach((m) => m.file && URL.revokeObjectURL(m.previewUrl)), []);

  const category = CATEGORY_CONFIG[values.category];
  const textOnly = media.length === 0;

  const validate = (upTo: number): boolean => {
    const next: Record<string, string> = {};
    if (upTo >= 0) {
      if (!values.title.trim()) next.title = "Give your showcase a title";
      else if (values.title.length > 150) next.title = "Keep the title under 150 characters";
    }
    if (upTo >= 1 && textOnly && values.description.trim().length < 20) {
      next.media = "Add a photo, video or recording - or write at least 20 characters in the description for written work.";
    }
    setErrors(next);
    if (next.title) setStep(0);
    else if (next.media) setStep(1);
    return Object.keys(next).length === 0;
  };

  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#/, "");
    if (!tag) return;
    if (values.tags.length >= 8) return toast.error("Up to 8 tags");
    if (!values.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) setValues((v) => ({ ...v, tags: [...v.tags, tag.slice(0, 30)] }));
    setTagDraft("");
  };

  const save = async (andSubmit: boolean) => {
    if (!validate(andSubmit ? 2 : 0)) return;
    setSaving(andSubmit ? "submit" : "draft");
    try {
      const talentId = editing ? id! : (createdId ?? (await createTalent(values, creatorSubtitle)).id);
      if (!editing) setCreatedId(talentId);

      for (const serverId of removedServerIds) await deleteTalentMedia(talentId, serverId);
      setRemovedServerIds([]);

      let items = media;
      const pending = media.filter((m) => !m.serverId && m.file);
      if (pending.length > 0) {
        setProgress(0);
        const uploaded = await uploadTalentMedia(talentId, pending.map((m) => ({ file: m.file!, durationSeconds: m.durationSeconds })), setProgress);
        const idByKey = new Map(pending.map((m, i) => [m.key, uploaded[i]?.id]));
        items = media.map((m) => (idByKey.has(m.key) ? { ...m, serverId: idByKey.get(m.key) } : m));
        setMedia(items);
      }

      await updateTalent(talentId, values, {
        mediaOrder: items.map((m) => m.serverId!).filter(Boolean),
        mediaCaptions: Object.fromEntries(items.filter((m) => m.serverId).map((m) => [m.serverId!, m.caption.trim() || null])),
      });

      if (andSubmit) {
        await submitTalent(talentId);
        toast.success("🎉 Submitted! We'll notify you once it's reviewed.");
      } else {
        toast.success("Draft saved");
      }
      await queryClient.invalidateQueries({ queryKey: ["talents"] });
      navigate(`/talents/${talentId}`, { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
      setProgress(null);
    }
  };

  const summary = useMemo(
    () => [
      { label: "Category", value: `${category.emoji} ${category.label}` },
      { label: "Media", value: media.length ? `${media.length} file${media.length === 1 ? "" : "s"}` : "Written work (no media)" },
      { label: "Visibility", value: `${VISIBILITY_CONFIG[values.visibility].emoji} ${VISIBILITY_CONFIG[values.visibility].label}` },
    ],
    [category, media.length, values.visibility],
  );

  if (!canCreate) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-10">
        <EmptyState emoji="🙌" title="Creating isn't enabled for your account" body="You can still discover and cheer on talents - explore what the campus is sharing." action={<Button onClick={() => navigate("/talents")}>Discover talents</Button>} />
      </div>
    );
  }
  if (editing && isLoading) return <div className="max-w-[960px] mx-auto px-4 pt-8"><div className="h-48 rounded-3xl cc-shimmer" /></div>;
  if (editing && existing && !existing.permissions.canEdit) {
    return (
      <div className="max-w-[900px] mx-auto px-4 pt-10">
        <EmptyState emoji="🔒" title="This showcase can't be edited right now" body="Only drafts and showcases returned for changes can be edited." action={<Button onClick={() => navigate(`/talents/${id}`)}>View showcase</Button>} />
      </div>
    );
  }

  const busy = saving !== null;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 pt-5 space-y-6">
      {/* Header */}
      <section className={cn("cc-hero rounded-[2rem] px-6 py-7 sm:px-8")}>
        <HeroDecor />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">{editing ? "Edit showcase" : "New showcase"}</p>
            <h1 className="cc-display text-2xl sm:text-3xl font-extrabold mt-1">{values.title.trim() || (editing ? "Update your talent" : "Share your talent ✨")}</h1>
            {existing?.reviewerFeedback && (existing.status === "needs_changes" || existing.status === "rejected") && (
              <p className="mt-3 cc-glass rounded-2xl px-4 py-2.5 text-sm text-white/90 max-w-xl">
                <span className="font-semibold">Reviewer feedback: </span>
                {existing.reviewerFeedback}
              </p>
            )}
          </div>
          <button type="button" onClick={() => navigate(-1)} className="cc-glass w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper */}
        <ol className="relative mt-6 grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button type="button" onClick={() => (i <= step || validate(i - 1)) && setStep(i)} className="w-full text-left cursor-pointer group" disabled={busy}>
                <span className={cn("block h-1.5 rounded-full transition-all", i <= step ? "bg-gradient-to-r from-violet-400 via-fuchsia-300 to-sky-300" : "bg-white/20")} />
                <span className="mt-2 flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0", i < step ? "bg-emerald-400 text-emerald-950" : i === step ? "bg-white text-[#1e1b4b]" : "bg-white/15 text-white/70")}>
                    {i < step ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className={i === step ? "text-white" : "text-white/65"}>{s.title}</span>
                </span>
                <span className="hidden sm:block text-xs text-white/50 pl-6.5">{s.hint}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="space-y-6">
          {step === 0 && (
            <>
              <Field label="Pick a category">
                <CategoryPicker value={values.category} onChange={(c) => setValues((v) => ({ ...v, category: c }))} />
              </Field>
              <Field label="Title" htmlFor="talent-title" error={errors.title}>
                <Input id="talent-title" value={values.title} maxLength={150} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} placeholder="e.g. “Moonlight Sonata on the school piano”" className="h-12 text-base" />
              </Field>
              <Field label="Tell the story" htmlFor="talent-description" hint={values.category === "writing" ? "For poems and writing with no media, your words are the showcase." : "What inspired it? How long did it take? What are you proud of?"}>
                <Textarea id="talent-description" rows={values.category === "writing" ? 10 : 5} maxLength={4000} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} placeholder="Share the story behind your talent…" />
                <p className="text-right text-xs text-muted-foreground mt-1 tabular-nums">{values.description.length}/4000</p>
              </Field>
              <Field label="Tags" hint="Up to 8 - help others discover your work">
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-input bg-card px-2 py-1.5 min-h-11 focus-within:ring-2 focus-within:ring-ring">
                  {values.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2.5 py-0.5 text-sm">
                      #{t}
                      <button type="button" onClick={() => setValues((v) => ({ ...v, tags: v.tags.filter((x) => x !== t) }))} className="cursor-pointer" aria-label={`Remove ${t}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    onBlur={addTag}
                    placeholder={values.tags.length ? "" : "piano, classical, grade8"}
                    className="flex-1 min-w-24 bg-transparent outline-none text-sm px-1"
                  />
                </div>
              </Field>
            </>
          )}

          {step === 1 && (
            <Field label="Add your media" error={errors.media}>
              <MediaDropzone
                items={media}
                disabled={busy}
                onAdd={async (files) => {
                  const staged = await stageFiles(files, media.length);
                  setMedia((m) => [...m, ...staged]);
                  setErrors((e) => ({ ...e, media: "" }));
                }}
                onRemove={(item) => {
                  if (item.serverId) setRemovedServerIds((ids) => [...ids, item.serverId!]);
                  if (item.file) URL.revokeObjectURL(item.previewUrl);
                  setMedia((m) => m.filter((x) => x.key !== item.key));
                }}
                onMove={(key, delta) =>
                  setMedia((m) => {
                    const i = m.findIndex((x) => x.key === key);
                    const j = i + delta;
                    if (i < 0 || j < 0 || j >= m.length) return m;
                    const next = [...m];
                    [next[i], next[j]] = [next[j]!, next[i]!];
                    return next;
                  })
                }
                onCaption={(key, caption) => setMedia((m) => m.map((x) => (x.key === key ? { ...x, caption } : x)))}
              />
              {textOnly && <p className="text-sm text-muted-foreground mt-3">✍️ Sharing a poem or story? You can skip media - your description becomes the showcase.</p>}
            </Field>
          )}

          {step === 2 && (
            <>
              <Field label="Who can see it once approved?">
                <VisibilityPicker value={values.visibility} onChange={(v) => setValues((x) => ({ ...x, visibility: v }))} publicAllowed={publicAllowed} />
              </Field>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground mb-3">Ready to share</p>
                <dl className="grid sm:grid-cols-3 gap-3">
                  {summary.map((s) => (
                    <div key={s.label} className="rounded-2xl bg-secondary/60 px-3.5 py-2.5">
                      <dt className="text-xs text-muted-foreground">{s.label}</dt>
                      <dd className="text-sm font-medium text-foreground mt-0.5">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <li className="font-medium text-foreground">✨ Submit</li>
                  <li>→ 👀 {isStudent ? "Your teacher or school admin reviews" : "A school admin reviews"}</li>
                  <li>→ ✅ Approved</li>
                  <li>→ 🌍 Visible to {values.visibility === "public" ? "everyone" : "your school"}</li>
                </ol>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {progress !== null && (
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Uploading media…</span>
            <span className="tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div className="h-full cc-gradient-bg" animate={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="sticky bottom-20 lg:bottom-4 z-20 flex items-center gap-2 rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-2.5 shadow-xl shadow-indigo-950/10">
        <Button type="button" variant="ghost" disabled={busy || step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <Button type="button" variant="outline" className="ml-auto" disabled={busy} onClick={() => void save(false)}>
          {saving === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden sm:inline">Save draft</span>
        </Button>
        {step < 2 ? (
          <Button type="button" className="cc-gradient-bg text-white" disabled={busy} onClick={() => validate(step) && setStep((s) => s + 1)}>
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="button" className="cc-gradient-bg text-white shadow-lg shadow-violet-900/25" disabled={busy} onClick={() => void save(true)}>
            {saving === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {existing && existing.status !== "draft" ? "Resubmit for approval" : "Submit for approval"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor={htmlFor} className="cc-display text-base font-bold text-foreground">
          {label}
        </Label>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
