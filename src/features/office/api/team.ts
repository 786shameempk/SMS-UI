import { officeHttp } from "./http";
import type { OfficeAuditEntry, OfficePermission, OfficeRole, OfficeSession, OfficeUserListItem, Paged } from "../types";

export interface UserQuery {
  search?: string;
  roleId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const listOfficeUsers = async (q: UserQuery) =>
  (await officeHttp.get<Paged<OfficeUserListItem>>("users", { params: { search: q.search || undefined, roleId: q.roleId || undefined, status: q.status || undefined, page: q.page, pageSize: q.pageSize } })).data;

export const inviteOfficeUser = async (body: { email: string; displayName: string; roleId: string }) =>
  (await officeHttp.post<OfficeUserListItem>("users", body)).data;

export const updateOfficeUser = async (id: string, body: { displayName?: string; roleId?: string; isActive?: boolean }) =>
  (await officeHttp.put<OfficeUserListItem>(`users/${id}`, body)).data;

export const resendOfficeInvite = async (id: string) => {
  await officeHttp.post(`users/${id}/resend-invite`);
};

export const resetOfficeUserPassword = async (id: string) => {
  await officeHttp.post(`users/${id}/reset-password`);
};

export const revokeOfficeUserSessions = async (id: string) => {
  await officeHttp.post(`users/${id}/revoke-sessions`);
};

export const listOfficeUserSessions = async (id: string) => (await officeHttp.get<OfficeSession[]>(`users/${id}/sessions`)).data;

export const officeUserHistory = async (id: string, page = 1) =>
  (await officeHttp.get<Paged<OfficeAuditEntry>>(`users/${id}/history`, { params: { page, pageSize: 20 } })).data;

export const listOfficeRoles = async () => (await officeHttp.get<OfficeRole[]>("roles")).data;

export const listOfficePermissions = async () => (await officeHttp.get<OfficePermission[]>("roles/permissions")).data;

export const saveOfficeRole = async (id: string | null, body: { name: string; description: string | null; permissions: string[] }) =>
  (id ? await officeHttp.put<OfficeRole>(`roles/${id}`, body) : await officeHttp.post<OfficeRole>("roles", body)).data;

export const deleteOfficeRole = async (id: string) => {
  await officeHttp.delete(`roles/${id}`);
};

export interface AuditQuery {
  from?: string;
  to?: string;
  actor?: string;
  action?: string;
  outcome?: string;
  tenantId?: string;
  page?: number;
  pageSize?: number;
}

export const searchOfficeAudit = async (q: AuditQuery) =>
  (await officeHttp.get<Paged<OfficeAuditEntry>>("audit", { params: { ...q, from: q.from || undefined, to: q.to || undefined, actor: q.actor || undefined, action: q.action || undefined, outcome: q.outcome || undefined, tenantId: q.tenantId || undefined } })).data;
