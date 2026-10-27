import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImagePlus, Play, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import AdvertisementBanner from "@/features/advertisements/AdvertisementBanner";
import { DEFAULT_AUTO_CLOSE_SECONDS, IMAGE_TYPES, MAX_AUTO_CLOSE_SECONDS, MAX_IMAGE_BYTES, MIN_AUTO_CLOSE_SECONDS } from "@/features/advertisements/rules";
import { AD_APPS, createAdvertisement, searchAdTenants, updateAdvertisement, uploadAdImage, type AdApp, type AdDetail } from "../api/advertisements";
import { errorText, useDebounced } from "../helpers";
import { FormErrorBanner } from "./kit";
import { blankForm, formFrom, toBody, validateForm, type FormState, type TargetForm } from "./adForm";

/** Create or edit one advertisement: its name and status, which schools see it, and, for each app separately, the image, link, close button and time. */
export default function AdvertisementFormDialog({ ad, onClose, onSaved }: { ad: AdDetail | null; onClose: () => void; onSaved: (ad: AdDetail) => void }) {
  const [form, setForm] = useState<FormState>(() => (ad ? formFrom(ad) : blankForm()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdApp | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const search = useDebounced(tenantSearch);

  const options = useQuery({ queryKey: ["office", "advertisement-tenants", search], queryFn: () => searchAdTenants(search), enabled: form.tenantMode === "Selected" });
  const save = useMutation({
    mutationFn: () => (ad ? updateAdvertisement(ad.id, toBody(form)) : createAdvertisement(toBody(form))),
    onSuccess: onSaved,
    onError: (e) => setServerError(errorText(e)),
  });

  const patch = (changes: Partial<FormState>) => setForm((f) => ({ ...f, ...changes }));
  const patchTarget = (app: AdApp, changes: Partial<TargetForm>) => setForm((f) => ({ ...f, targets: f.targets.map((t) => (t.app === app ? { ...t, ...changes } : t)) }));

  const submit = () => {
    const found = validateForm(form);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length === 0) save.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ad ? "Edit advertisement" : "New advertisement"}</DialogTitle>
          <DialogDescription>Set who sees it, then switch on each application and give it an image. Applications are independent: turn on only the ones you want.</DialogDescription>
        </DialogHeader>
        <FormErrorBanner message={serverError} />

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ad-name">Name</Label>
            <Input id="ad-name" value={form.name} onChange={(e) => patch({ name: e.target.value })} maxLength={150} aria-invalid={errors.name ? true : undefined} />
            {errors.name && <p role="alert" className="text-xs text-destructive-strong">{errors.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Switch id="ad-active" checked={form.isActive} onCheckedChange={(v) => patch({ isActive: v })} />
            <Label htmlFor="ad-active">Active (an inactive advertisement is never shown)</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad-priority">Display order (lower is shown first)</Label>
            <Input id="ad-priority" inputMode="numeric" value={form.priority} onChange={(e) => patch({ priority: e.target.value })} aria-invalid={errors.priority ? true : undefined} />
            {errors.priority && <p role="alert" className="text-xs text-destructive-strong">{errors.priority}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad-start">Show from (optional)</Label>
            <Input id="ad-start" type="datetime-local" value={form.startsAt} onChange={(e) => patch({ startsAt: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad-end">Show until (optional)</Label>
            <Input id="ad-end" type="datetime-local" value={form.endsAt} onChange={(e) => patch({ endsAt: e.target.value })} aria-invalid={errors.endsAt ? true : undefined} />
            {errors.endsAt && <p role="alert" className="text-xs text-destructive-strong">{errors.endsAt}</p>}
          </div>
        </section>

        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">Schools</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="tenant-mode" checked={form.tenantMode === "All"} onChange={() => patch({ tenantMode: "All" })} /> All schools
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="tenant-mode" checked={form.tenantMode === "Selected"} onChange={() => patch({ tenantMode: "Selected" })} /> Selected schools
            </label>
          </div>
          {form.tenantMode === "Selected" && (
            <div className="space-y-2">
              <Input aria-label="Search schools" placeholder="Search schools by name or subdomain" value={tenantSearch} onChange={(e) => setTenantSearch(e.target.value)} />
              <div className="flex flex-wrap gap-2" aria-label="Selected schools">
                {form.tenants.map((t) => (
                  <Badge key={t.id} variant="brand" className="gap-1">
                    {t.name}
                    <button type="button" aria-label={`Remove ${t.name}`} onClick={() => patch({ tenants: form.tenants.filter((x) => x.id !== t.id) })}>
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
                {form.tenants.length === 0 && <span className="text-xs text-muted-foreground">No school selected yet.</span>}
              </div>
              <ul className="max-h-44 divide-y overflow-y-auto rounded-md border text-sm">
                {(options.data ?? []).map((t) => {
                  const checked = form.tenants.some((x) => x.id === t.id);
                  return (
                    <li key={t.id}>
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-2">
                        <Checkbox checked={checked} onCheckedChange={(v) => patch({ tenants: v ? [...form.tenants, { id: t.id, name: t.name, subdomain: t.subdomain }] : form.tenants.filter((x) => x.id !== t.id) })} aria-label={t.name} />
                        <span className="flex-1">{t.name}</span>
                        <span className="text-xs text-muted-foreground">{t.subdomain}</span>
                      </label>
                    </li>
                  );
                })}
                {options.data?.length === 0 && <li className="px-3 py-2 text-muted-foreground">No school matches.</li>}
              </ul>
              {errors.tenants && <p role="alert" className="text-xs text-destructive-strong">{errors.tenants}</p>}
            </div>
          )}
        </fieldset>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Applications</h3>
          {AD_APPS.map(({ app, label, hint }) => (
            <TargetCard key={app} label={label} hint={hint} target={form.targets.find((t) => t.app === app)!} errors={errors} onChange={(c) => patchTarget(app, c)} onPreview={() => setPreview(app)} />
          ))}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={submit} loading={save.isPending} disabled={form.targets.some((t) => t.uploading)}>{ad ? "Save changes" : "Create advertisement"}</Button>
        </DialogFooter>
        {preview && <PreviewDialog target={form.targets.find((t) => t.app === preview)!} onClose={() => setPreview(null)} />}
      </DialogContent>
    </Dialog>
  );
}

function TargetCard({ label, hint, target, errors, onChange, onPreview }: { label: string; hint: string; target: TargetForm; errors: Record<string, string>; onChange: (c: Partial<TargetForm>) => void; onPreview: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const id = `ad-${target.app}`;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return setUploadError("Choose a PNG, JPEG or WebP image.");
    if (file.size > MAX_IMAGE_BYTES) return setUploadError(`The image must be ${MAX_IMAGE_BYTES / (1024 * 1024)} MB or smaller.`);
    onChange({ uploading: true });
    try {
      const uploaded = await uploadAdImage(file);
      onChange({ imageKey: uploaded.imageKey, imageUrl: uploaded.imageUrl, uploading: false });
    } catch (e) {
      setUploadError(errorText(e));
      onChange({ uploading: false });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={target.enabled} onCheckedChange={(v) => onChange({ enabled: v })} aria-label={`Show on ${label}`} />
          {target.enabled ? "On" : "Off"}
        </label>
      </div>

      {target.enabled && (
        <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
          <div className="space-y-2">
            <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
              {target.imageUrl ? <img src={target.imageUrl} alt={`${label} advertisement preview`} className="block aspect-[4/5] w-full object-cover" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
            </div>
            <input ref={input} id={`${id}-file`} type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" aria-label={`Image for ${label}`} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="outline" size="sm" loading={target.uploading} onClick={() => input.current?.click()}>
              {target.imageUrl ? "Replace image" : "Upload image"}
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to {MAX_IMAGE_BYTES / (1024 * 1024)} MB. Shown in a standard 4:5 portrait frame — use 1080 x 1350 px for the best fit.</p>
            {(uploadError || errors[`${target.app}.image`]) && <p role="alert" className="text-xs text-destructive-strong">{uploadError ?? errors[`${target.app}.image`]}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${id}-link`}>Link when the image is clicked (optional)</Label>
              <Input id={`${id}-link`} placeholder="https://example.com/offer" value={target.redirectUrl} onChange={(e) => onChange({ redirectUrl: e.target.value })} aria-invalid={errors[`${target.app}.redirectUrl`] ? true : undefined} />
              {errors[`${target.app}.redirectUrl`] ? <p role="alert" className="text-xs text-destructive-strong">{errors[`${target.app}.redirectUrl`]}</p> : <p className="text-xs text-muted-foreground">Leave empty and the image does nothing when clicked. Only https links.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-seconds`}>Auto-close after (seconds)</Label>
              <Input id={`${id}-seconds`} inputMode="numeric" value={target.autoCloseSeconds} onChange={(e) => onChange({ autoCloseSeconds: e.target.value })} aria-invalid={errors[`${target.app}.autoCloseSeconds`] ? true : undefined} />
              {errors[`${target.app}.autoCloseSeconds`] ? <p role="alert" className="text-xs text-destructive-strong">{errors[`${target.app}.autoCloseSeconds`]}</p> : <p className="text-xs text-muted-foreground">{MIN_AUTO_CLOSE_SECONDS} to {MAX_AUTO_CLOSE_SECONDS}. Applies even without a close button.</p>}
            </div>
            <div className="flex items-center gap-3 self-end pb-6">
              <Switch id={`${id}-close`} checked={target.showCloseButton} onCheckedChange={(v) => onChange({ showCloseButton: v })} />
              <Label htmlFor={`${id}-close`}>Show close button</Label>
            </div>
            <div className="sm:col-span-2">
              <Button type="button" variant="outline" size="sm" disabled={!target.imageUrl} onClick={onPreview}>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shows the banner as people will see it, with the close button on or off so both can be checked, and replays the countdown. */
export function PreviewDialog({ target, onClose }: { target: Pick<TargetForm, "imageUrl" | "redirectUrl" | "autoCloseSeconds" | "showCloseButton">; onClose: () => void }) {
  const [round, setRound] = useState(0);
  const [showClose, setShowClose] = useState(target.showCloseButton);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const seconds = Number(target.autoCloseSeconds) || DEFAULT_AUTO_CLOSE_SECONDS;
  const stamp = `${round}-${showClose}`;
  const finished = finishedAt === stamp;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>Auto-closes after {seconds} seconds{target.redirectUrl ? "; the image opens the link in a new tab" : "; the image has no link"}.</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-48 items-center justify-center rounded-md bg-muted/40 p-4">
          {!finished && target.imageUrl ? (
            <AdvertisementBanner key={`${round}-${showClose}`} variant="inline" imageUrl={target.imageUrl} redirectUrl={target.redirectUrl} autoCloseSeconds={seconds} showCloseButton={showClose} onClose={() => setFinishedAt(stamp)} onImageError={() => setFinishedAt(stamp)} />
          ) : (
            <p className="text-sm text-muted-foreground">The advertisement has closed.</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showClose} onCheckedChange={setShowClose} aria-label="Preview with close button" /> Preview with the close button
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRound(round + 1)}>Replay</Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
