import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { cancelChange, listMyProfiles, listMyRequests, saveProfile, submitProfile, type ChangeStatus, type Profile, type ProfileChange, type ProfileField, type ProfileStatus } from "./api";

const STATUS_TONE: Record<ProfileStatus, BadgeVariant> = { Incomplete: "warning", PendingApproval: "info", ChangesRequested: "danger", Approved: "success" };
const STATUS_LABEL: Record<ProfileStatus, string> = {
  Incomplete: "Needs your details",
  PendingApproval: "Waiting for the school's office",
  ChangesRequested: "Changes requested",
  Approved: "Approved",
};

const NOT_PROVIDED = "Not provided";

const isMissing = (key: string, value: string | null | undefined) => !value || !value.trim() || value === NOT_PROVIDED || (key === "blood_group" && value === "unknown");

/** "Not provided" is shown as an empty box so the person fills it in rather than keeping the placeholder. */
const fieldValue = (f: ProfileField) => (f.value === NOT_PROVIDED || (f.key === "blood_group" && f.value === "unknown") ? "" : (f.value ?? ""));

/**
 * Profile completion for people the school's office imported: the person (or a parent, for a child) adds what the import could
 * not know, submits, and the office approves. Everything shown as read-only (IDs, role, class) can only be changed by the office.
 */
export default function MyProfilePage() {
  const { t } = useTranslation();
  const profiles = useQuery({ queryKey: ["my-profile"], queryFn: listMyProfiles });

  return (
    <PageContainer>
      <PageHeader title={t("My profile")} description={t("Check your details and fill in anything missing. Changes are reviewed by your approver before they take effect.")} icon={UserRound} />
      {profiles.isLoading && <Skeleton className="h-64 w-full" />}
      {profiles.isError && <ErrorState description={(profiles.error as Error).message} onRetry={() => void profiles.refetch()} />}
      {profiles.data?.length === 0 && (
        <EmptyState icon={UserRound} title={t("No profile found")} description={t("No profile is linked to this account yet. Ask the school's office to check your account.")} />
      )}
      {profiles.data?.map((p) => (p.mode === "approval" ? <ApprovalCard key={`${p.personType}:${p.personId}`} profile={p} /> : <ProfileCard key={`${p.personType}:${p.personId}`} profile={p} />))}
    </PageContainer>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const dirtyKeys = Object.keys(draft).filter((k) => draft[k] !== fieldValue(profile.fields.find((f) => f.key === k)!));
  const refresh = (updated: Profile) => {
    qc.setQueryData<Profile[]>(["my-profile"], (old) => old?.map((p) => (p.personId === updated.personId && p.personType === updated.personType ? updated : p)));
    setDraft({});
  };
  const save = useMutation({
    mutationFn: () => saveProfile(profile, Object.fromEntries(dirtyKeys.map((k) => [k, draft[k]]))),
    onSuccess: (p) => { toast.success(t("Saved.")); refresh(p); },
    onError: (e) => toast.error((e as Error).message),
  });
  const submit = useMutation({
    mutationFn: () => submitProfile(profile),
    onSuccess: (p) => { toast.success(t("Sent to the school's office.")); refresh(p); },
    onError: (e) => toast.error((e as Error).message),
  });

  const stillMissing = (f: ProfileField) => f.required && (draft[f.key] !== undefined ? isMissing(f.key, draft[f.key]) : f.missing);
  const missingNow = profile.fields.filter(stillMissing);
  const groups = [...new Set(profile.fields.map((f) => f.group))];
  const canSubmit = !profile.locked && profile.status !== "Approved" && dirtyKeys.length === 0 && missingNow.length === 0;

  return (
    <Card aria-label={profile.displayName}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {profile.displayName}
          <Badge variant={STATUS_TONE[profile.status]}>{t(STATUS_LABEL[profile.status])}</Badge>
        </CardTitle>
        <CardDescription>
          {profile.relation === "child" ? `${t("Your child")} · ` : ""}
          {profile.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {profile.status === "ChangesRequested" && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">{t("The school's office asked for changes")}</p>
            {profile.feedback?.reason && <p className="mt-1">{profile.feedback.reason}</p>}
          </div>
        )}
        {profile.status === "PendingApproval" && (
          <p className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t("Sent for review. You can edit again once the office replies.")}
          </p>
        )}
        {profile.status === "Approved" && (
          <p className="flex items-center gap-2 rounded-md border border-success/40 bg-success/5 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t("Approved by the school's office.")}
          </p>
        )}
        {missingNow.length > 0 && !profile.locked && (
          <p className="text-sm text-muted-foreground">
            {t("Still needed")}: {missingNow.map((f) => f.label).join(", ")}
          </p>
        )}

        {groups.map((group) => (
          <fieldset key={group} className="space-y-3">
            <legend className="text-sm font-semibold">{t(group)}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.fields
                .filter((f) => f.group === group)
                .map((f) => (
                  <FieldRow key={f.key} field={f} value={draft[f.key] ?? fieldValue(f)} missing={stillMissing(f)} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
                ))}
            </div>
          </fieldset>
        ))}

        {(profile.status !== "Approved" || dirtyKeys.length > 0) && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={dirtyKeys.length === 0 || profile.locked}>
              {t("Save")}
            </Button>
            <Button variant="outline" onClick={() => submit.mutate()} loading={submit.isPending} disabled={!canSubmit}>
              {t("Send for approval")}
            </Button>
          </div>
        )}
        {profile.status === "Approved" && profile.fields.some((f) => f.sensitive && f.editable) && (
          <p className="text-xs text-muted-foreground">{t("Changing a name or date of birth sends the profile back to the office for approval.")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ field, value, missing, onChange }: { field: ProfileField; value: string; missing: boolean; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const id = `profile-${field.key}`;
  const label = (
    <label htmlFor={id} className="mb-1 block text-sm font-medium">
      {t(field.label)}
      {field.required && field.editable ? " *" : ""}
      {missing && <span className="ml-2 text-xs text-destructive">{t("missing")}</span>}
    </label>
  );
  if (!field.editable) {
    return (
      <div>
        {label}
        <p id={id} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {field.value || "—"}
        </p>
      </div>
    );
  }

  return (
    <div className={field.kind === "textarea" ? "sm:col-span-2" : undefined}>
      {label}
      {field.kind === "textarea" ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={2} maxLength={500} />
      ) : field.kind === "select" ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
          <option value="">{t("Choose…")}</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o === "unknown" ? t("Unknown") : o}
            </option>
          ))}
        </select>
      ) : (
        <Input id={id} type={field.kind === "date" ? "date" : field.kind === "phone" ? "tel" : "text"} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

const CHANGE_TONE: Record<ChangeStatus, BadgeVariant> = { Pending: "info", Approved: "success", Rejected: "danger", Cancelled: "neutral" };

const PHONE = /^\+?[0-9][0-9 ()-]{5,28}$/;

/** Checks a value the same way the server will, so an obvious mistake is shown before anything is sent. */
function problemWith(field: ProfileField, value: string): string | null {
  const v = value.trim();
  if (!v) return field.required ? `${field.label} is required.` : null;
  if (field.kind === "phone" && !PHONE.test(v)) return `${field.label} is not a valid phone number.`;
  if (field.kind === "email" && !v.includes("@")) return `${field.label} is not a valid email address.`;
  if (field.kind === "date" && Number.isNaN(Date.parse(v))) return `${field.label} must be a date.`;
  if (field.kind === "select" && field.options && !field.options.some((o) => o.toLowerCase() === v.toLowerCase())) return `${field.label} must be one of: ${field.options.join(", ")}.`;
  if (v.length > (field.kind === "textarea" ? 500 : 200)) return `${field.label} is too long.`;
  return null;
}

function ApprovalCard({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const requests = useQuery({ queryKey: ["my-profile-requests"], queryFn: listMyRequests });

  const mine = (requests.data ?? []).filter((r) => r.personType === profile.personType && r.personId === profile.personId).slice(0, 5);
  const editable = profile.fields.filter((f) => f.editable);
  const groups = [...new Set(profile.fields.map((f) => f.group))];
  const valueOf = (f: ProfileField) => draft[f.key] ?? fieldValue(f);
  const dirtyKeys = editable.map((f) => f.key).filter((k) => draft[k] !== undefined && draft[k].trim() !== fieldValue(profile.fields.find((f) => f.key === k)!));

  const stop = () => { setEditing(false); setDraft({}); setErrors({}); setServerError(null); };
  const refresh = (updated: Profile) => {
    qc.setQueryData<Profile[]>(["my-profile"], (old) => old?.map((p) => (p.personId === updated.personId && p.personType === updated.personType ? updated : p)));
    void qc.invalidateQueries({ queryKey: ["my-profile-requests"] });
  };
  const save = useMutation({
    mutationFn: () => saveProfile(profile, Object.fromEntries(dirtyKeys.map((k) => [k, draft[k].trim()]))),
    onSuccess: (p) => {
      refresh(p);
      toast.success(p.pending ? t("Sent to {{who}} for approval.", { who: p.pending.approverName ?? t("the school's administrators") }) : t("Saved."));
      stop();
    },
    // The draft is kept so nothing typed is lost; the message says what to fix.
    onError: (e) => setServerError((e as Error).message),
  });
  const withdraw = useMutation({
    mutationFn: (id: string) => cancelChange(id),
    onSuccess: () => { toast.success(t("Request withdrawn.")); void qc.invalidateQueries({ queryKey: ["my-profile"] }); void qc.invalidateQueries({ queryKey: ["my-profile-requests"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const submit = () => {
    const found: Record<string, string> = {};
    for (const k of dirtyKeys) {
      const f = profile.fields.find((x) => x.key === k)!;
      const problem = problemWith(f, draft[k]);
      if (problem) found[k] = problem;
    }
    setErrors(found);
    setServerError(null);
    if (dirtyKeys.length === 0) { setServerError(t("Nothing has changed.")); return; }
    if (Object.keys(found).length === 0) save.mutate();
  };

  const waiting = profile.fields.filter((f) => f.pending);
  const initials = profile.displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Card aria-label={profile.displayName}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">{initials}</div>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {profile.displayName}
              <Badge variant={waiting.length > 0 ? "info" : "success"}>{waiting.length > 0 ? t("Change waiting for approval") : t("Up to date")}</Badge>
            </CardTitle>
            <CardDescription>
              {profile.relation === "child" ? `${t("Your child")} Â· ` : ""}
              {profile.subtitle}
            </CardDescription>
          </div>
          {!editing && editable.length > 0 && (
            <Button variant="outline" onClick={() => setEditing(true)}>{t("Edit profile")}</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {profile.pending && (
          <div role="status" className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t("Waiting for {{who}} to approve", { who: profile.pending.approverName ?? t("the school's administrators") })}
            </p>
            <ul className="list-disc pl-6">
              {profile.pending.changes.map((c) => (
                <li key={c.key}>{t(c.label)}: <span className="text-muted-foreground line-through">{c.from || "â€”"}</span> â†’ <strong>{c.to || "â€”"}</strong></li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t("Your profile keeps the current values until it is approved.")}</p>
            <Button size="sm" variant="outline" loading={withdraw.isPending} onClick={() => withdraw.mutate(profile.pending!.id)}>{t("Withdraw request")}</Button>
          </div>
        )}
        {!profile.pending && profile.lastRejected && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">{t("Your last change was rejected")}{profile.lastRejected.reviewedByName ? ` ${t("by")} ${profile.lastRejected.reviewedByName}` : ""}</p>
            {profile.lastRejected.reviewerComment && <p className="mt-1">{profile.lastRejected.reviewerComment}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{t("Your profile was not changed. Edit it again to send a corrected request.")}</p>
          </div>
        )}
        {!profile.pending && !editing && profile.approver && editable.length > 0 && (
          <p className="text-xs text-muted-foreground">{t("Changes you make are reviewed by")} {profile.approver}.</p>
        )}
        {serverError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-strong">{serverError}</p>}

        {groups.map((group) => (
          <fieldset key={group} className="space-y-3">
            <legend className="text-sm font-semibold">{t(group)}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.fields.filter((f) => f.group === group).map((f) =>
                editing && f.editable ? (
                  <div key={f.key} className={f.kind === "textarea" ? "sm:col-span-2" : undefined}>
                    <FieldRow field={f} value={valueOf(f)} missing={false} onChange={(v) => { setDraft((d) => ({ ...d, [f.key]: v })); setErrors((e) => ({ ...e, [f.key]: "" })); }} />
                    {f.needsApproval === false && <p className="mt-1 text-xs text-muted-foreground">{t("Applied straight away")}</p>}
                    {errors[f.key] && <p role="alert" className="mt-1 text-xs text-destructive-strong">{errors[f.key]}</p>}
                  </div>
                ) : (
                  <div key={f.key} className={f.kind === "textarea" ? "sm:col-span-2" : undefined}>
                    <p className="mb-1 text-sm font-medium">{t(f.label)}</p>
                    <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{f.value && f.value !== NOT_PROVIDED ? f.value : "â€”"}</p>
                    {f.pending && <p className="mt-1 text-xs text-muted-foreground">{t("Requested")}: <strong>{f.pendingValue || "â€”"}</strong></p>}
                  </div>
                ),
              )}
            </div>
          </fieldset>
        ))}

        {editing && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} loading={save.isPending}>{t("Save changes")}</Button>
            <Button variant="outline" onClick={stop} disabled={save.isPending}>{t("Cancel")}</Button>
          </div>
        )}

        {mine.length > 0 && (
          <section aria-label={t("Recent requests")} className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">{t("Recent requests")}</h3>
            <ul className="space-y-2 text-sm">
              {mine.map((r: ProfileChange) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant={CHANGE_TONE[r.status]}>{t(r.status)}</Badge>
                  <span>{r.changes.map((c) => t(c.label)).join(", ")}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.submittedAt).toLocaleDateString()}</span>
                  {r.status === "Rejected" && r.reviewerComment && <span className="text-xs text-muted-foreground">â€” {r.reviewerComment}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

