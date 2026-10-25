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
import { listMyProfiles, saveProfile, submitProfile, type Profile, type ProfileField, type ProfileStatus } from "./api";

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
      <PageHeader title={t("My profile")} description={t("Check your details, fill in anything missing and send them to the school's office to approve.")} icon={UserRound} />
      {profiles.isLoading && <Skeleton className="h-64 w-full" />}
      {profiles.isError && <ErrorState description={(profiles.error as Error).message} onRetry={() => void profiles.refetch()} />}
      {profiles.data?.length === 0 && (
        <EmptyState icon={UserRound} title={t("Nothing to complete")} description={t("Your account was not set up through the school's bulk import, so there is no profile to complete.")} />
      )}
      {profiles.data?.map((p) => <ProfileCard key={`${p.personType}:${p.personId}`} profile={p} />)}
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
