import { officeHttp } from "./http";
import type { Addon, AddonRequest, Catalog, Paged, PlanDetail, PlanListItem, PlanVersion, PlanVersionRequest, QuoteBreakdown, QuoteSelection } from "../types";

export const listPlans = async (q: { search?: string; status?: string; page?: number; pageSize?: number }) =>
  (await officeHttp.get<Paged<PlanListItem>>("plans", { params: { search: q.search || undefined, status: q.status || undefined, page: q.page, pageSize: q.pageSize } })).data;

export const sellablePlans = async () => (await officeHttp.get<PlanListItem[]>("plans/sellable")).data;

export const getPlan = async (id: string) => (await officeHttp.get<PlanDetail>(`plans/${id}`)).data;

export const getPublishedVersion = async (planId: string) => (await officeHttp.get<PlanVersion>(`plans/${planId}/published-version`)).data;

export const createPlan = async (body: { code: string; name: string; description: string | null; version: PlanVersionRequest }) =>
  (await officeHttp.post<PlanDetail>("plans", body)).data;

export const updatePlan = async (id: string, body: { name: string; description: string | null }) => (await officeHttp.put<PlanDetail>(`plans/${id}`, body)).data;

export const deletePlan = async (id: string) => {
  await officeHttp.delete(`plans/${id}`);
};

export const archivePlan = async (id: string) => {
  await officeHttp.post(`plans/${id}/archive`);
};

export const restorePlan = async (id: string) => {
  await officeHttp.post(`plans/${id}/restore`);
};

export const newPlanVersion = async (id: string) => (await officeHttp.post<PlanVersion>(`plans/${id}/versions`)).data;

export const updatePlanVersion = async (id: string, versionId: string, body: PlanVersionRequest) =>
  (await officeHttp.put<PlanVersion>(`plans/${id}/versions/${versionId}`, body)).data;

export const discardPlanVersion = async (id: string, versionId: string) => {
  await officeHttp.delete(`plans/${id}/versions/${versionId}`);
};

export const publishPlanVersion = async (id: string, versionId: string) => (await officeHttp.post<PlanVersion>(`plans/${id}/versions/${versionId}/publish`)).data;

export const listAddons = async (activeOnly = false) => (await officeHttp.get<Addon[]>("addons", { params: { activeOnly } })).data;

export const saveAddon = async (id: string | null, body: AddonRequest) => (id ? await officeHttp.put<Addon>(`addons/${id}`, body) : await officeHttp.post<Addon>("addons", body)).data;

export const getCatalog = async () => (await officeHttp.get<Catalog>("catalog")).data;

export const previewPricing = async (selection: QuoteSelection) => (await officeHttp.post<QuoteBreakdown>("pricing/preview", selection)).data;
