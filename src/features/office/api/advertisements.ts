import { AUTH_API_BASE_URL, resolveFileUrl } from "@/lib/httpClient";
import { officeHttp } from "./http";
import type { Paged } from "../types";

export type AdApp = "Web" | "Student" | "Teacher" | "Staff";

/** The names the apps go by in the repository, shown to the administrator. */
export const AD_APPS: { app: AdApp; label: string; hint: string }[] = [
  { app: "Web", label: "School Sphere Web Application", hint: "The home dashboard of the web app" },
  { app: "Student", label: "Student/Parent Mobile Application", hint: "The home tab of the student app" },
  { app: "Teacher", label: "Teacher Mobile Application", hint: "The home tab of the teacher app" },
  { app: "Staff", label: "Staff Mobile Application", hint: "The home tab of the staff app" },
];

export interface AdTarget {
  app: AdApp;
  enabled: boolean;
  imageKey: string | null;
  imageUrl: string | null;
  redirectUrl: string | null;
  autoCloseSeconds: number;
  showCloseButton: boolean;
}

export interface AdListItem {
  id: string;
  name: string;
  isActive: boolean;
  status: "Live" | "Scheduled" | "Expired" | "Inactive";
  priority: number;
  tenantMode: "All" | "Selected";
  tenantCount: number;
  startsAt: string | null;
  endsAt: string | null;
  targets: AdTarget[];
  createdAt: string;
  updatedAt: string | null;
}

export interface AdTenant {
  id: string;
  name: string;
  subdomain: string;
}

export interface AdDetail extends Omit<AdListItem, "tenantCount"> {
  tenants: AdTenant[];
}

export interface AdTenantOption extends AdTenant {
  status: string;
}

export interface SaveAdBody {
  name: string;
  isActive: boolean;
  priority: number;
  tenantMode: "All" | "Selected";
  tenantIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  targets: { app: AdApp; enabled: boolean; imageKey: string | null; redirectUrl: string | null; autoCloseSeconds: number; showCloseButton: boolean }[];
}

export interface AdQuery {
  search?: string;
  status?: string;
  app?: string;
  page?: number;
  pageSize?: number;
}

/** Image links come back relative to the sign-in service; made absolute here so the page can show them. */
const withUrls = <T extends { targets: AdTarget[] }>(ad: T): T => ({
  ...ad,
  targets: ad.targets.map((t) => ({ ...t, imageUrl: t.imageUrl ? (resolveFileUrl(t.imageUrl, AUTH_API_BASE_URL) ?? t.imageUrl) : null })),
});

export const listAdvertisements = async (q: AdQuery) => {
  const page = (await officeHttp.get<Paged<AdListItem>>("advertisements", { params: { search: q.search || undefined, status: q.status || undefined, app: q.app || undefined, page: q.page, pageSize: q.pageSize } })).data;
  return { ...page, items: page.items.map(withUrls) };
};

export const getAdvertisement = async (id: string) => withUrls((await officeHttp.get<AdDetail>(`advertisements/${id}`)).data);

export const createAdvertisement = async (body: SaveAdBody) => withUrls((await officeHttp.post<AdDetail>("advertisements", body)).data);

export const updateAdvertisement = async (id: string, body: SaveAdBody) => withUrls((await officeHttp.put<AdDetail>(`advertisements/${id}`, body)).data);

export const setAdvertisementActive = async (id: string, active: boolean) => withUrls((await officeHttp.put<AdDetail>(`advertisements/${id}/active`, { active })).data);

export const deleteAdvertisement = async (id: string) => {
  await officeHttp.delete(`advertisements/${id}`);
};

export const searchAdTenants = async (search: string) => (await officeHttp.get<AdTenantOption[]>("advertisements/tenants", { params: { search: search || undefined, take: 30 } })).data;

export const uploadAdImage = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const result = (await officeHttp.post<{ imageKey: string; imageUrl: string }>("advertisements/images", form)).data;
  return { imageKey: result.imageKey, imageUrl: resolveFileUrl(result.imageUrl, AUTH_API_BASE_URL) ?? result.imageUrl };
};
