import { DEFAULT_AUTO_CLOSE_SECONDS, autoCloseProblem, linkProblem } from "@/features/advertisements/rules";
import { AD_APPS, type AdApp, type AdDetail, type AdTenant, type SaveAdBody } from "../api/advertisements";
export interface TargetForm {
  app: AdApp;
  enabled: boolean;
  imageKey: string | null;
  imageUrl: string | null;
  redirectUrl: string;
  autoCloseSeconds: string;
  showCloseButton: boolean;
  uploading: boolean;
}

export interface FormState {
  name: string;
  isActive: boolean;
  priority: string;
  tenantMode: "All" | "Selected";
  tenants: AdTenant[];
  startsAt: string;
  endsAt: string;
  targets: TargetForm[];
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function blankForm(): FormState {
  return {
    name: "",
    isActive: true,
    priority: "100",
    tenantMode: "All",
    tenants: [],
    startsAt: "",
    endsAt: "",
    targets: AD_APPS.map(({ app }) => ({ app, enabled: false, imageKey: null, imageUrl: null, redirectUrl: "", autoCloseSeconds: String(DEFAULT_AUTO_CLOSE_SECONDS), showCloseButton: true, uploading: false })),
  };
}

export function formFrom(ad: AdDetail): FormState {
  return {
    name: ad.name,
    isActive: ad.isActive,
    priority: String(ad.priority),
    tenantMode: ad.tenantMode,
    tenants: ad.tenants,
    startsAt: toLocalInput(ad.startsAt),
    endsAt: toLocalInput(ad.endsAt),
    targets: AD_APPS.map(({ app }) => {
      const t = ad.targets.find((x) => x.app === app);
      return {
        app,
        enabled: t?.enabled ?? false,
        imageKey: t?.imageKey ?? null,
        imageUrl: t?.imageUrl ?? null,
        redirectUrl: t?.redirectUrl ?? "",
        autoCloseSeconds: String(t?.autoCloseSeconds ?? DEFAULT_AUTO_CLOSE_SECONDS),
        showCloseButton: t?.showCloseButton ?? true,
        uploading: false,
      };
    }),
  };
}

/** The same checks the server makes, so a mistake is shown beside its field before anything is sent. */
export function validateForm(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = "Give the advertisement a name.";
  else if (f.name.trim().length > 150) e.name = "The name is longer than 150 characters.";
  const priority = Number(f.priority);
  if (!Number.isInteger(priority) || priority < 0 || priority > 10000) e.priority = "Display order must be a whole number from 0 to 10,000.";
  if (f.tenantMode === "Selected" && f.tenants.length === 0) e.tenants = "Choose at least one school, or choose All schools.";
  if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt)) e.endsAt = "The end must be after the start.";
  for (const t of f.targets) {
    const link = linkProblem(t.redirectUrl);
    if (link) e[`${t.app}.redirectUrl`] = link;
    if (t.enabled) {
      if (!t.imageKey) e[`${t.app}.image`] = "Upload an image before turning this application on.";
      const time = autoCloseProblem(Number(t.autoCloseSeconds));
      if (time) e[`${t.app}.autoCloseSeconds`] = time;
    }
  }

  return e;
}

export const toBody = (f: FormState): SaveAdBody => ({
  name: f.name.trim(),
  isActive: f.isActive,
  priority: Number(f.priority),
  tenantMode: f.tenantMode,
  tenantIds: f.tenantMode === "Selected" ? f.tenants.map((t) => t.id) : [],
  startsAt: fromLocalInput(f.startsAt),
  endsAt: fromLocalInput(f.endsAt),
  targets: f.targets.map((t) => ({
    app: t.app,
    enabled: t.enabled,
    imageKey: t.imageKey,
    redirectUrl: t.redirectUrl.trim() || null,
    autoCloseSeconds: Number(t.autoCloseSeconds) || DEFAULT_AUTO_CLOSE_SECONDS,
    showCloseButton: t.showCloseButton,
  })),
});
