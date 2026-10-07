import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { Branch, BranchFormValues, BranchStatus, TeacherClassScope } from "./types";

// Real AuthService-backed (/api/branches). The server scopes every call to the active tenant and
// lazily provisions each tenant's "Main Campus" ({tenantId}-main) the first time it's listed.

interface ApiBranch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  status: "Active" | "Inactive";
  /** Absent on servers that predate the setting. */
  teacherClassScope?: "AssignedAndSubject" | "Assigned" | "All";
  createdAt: string;
}

const STATUS_TO_API: Record<BranchStatus, ApiBranch["status"]> = { active: "Active", inactive: "Inactive" };
const STATUS_FROM_API: Record<ApiBranch["status"], BranchStatus> = { Active: "active", Inactive: "inactive" };

const SCOPE_TO_API: Record<TeacherClassScope, NonNullable<ApiBranch["teacherClassScope"]>> = { assigned_and_subject: "AssignedAndSubject", assigned: "Assigned", all: "All" };
const SCOPE_FROM_API: Record<NonNullable<ApiBranch["teacherClassScope"]>, TeacherClassScope> = { AssignedAndSubject: "assigned_and_subject", Assigned: "assigned", All: "all" };

const mapBranch = (dto: ApiBranch): Branch => ({
  id: dto.id,
  tenantId: dto.tenantId,
  name: dto.name,
  code: dto.code,
  address: dto.address ?? undefined,
  phone: dto.phone ?? undefined,
  status: STATUS_FROM_API[dto.status],
  teacherClassScope: SCOPE_FROM_API[dto.teacherClassScope ?? "AssignedAndSubject"],
  createdAt: dto.createdAt,
});

const toRequest = (values: BranchFormValues) => ({
  name: values.name,
  code: values.code,
  address: values.address || null,
  phone: values.phone || null,
  status: STATUS_TO_API[values.status],
  teacherClassScope: SCOPE_TO_API[values.teacherClassScope],
});

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export async function listBranches(): Promise<Branch[]> {
  return (await unwrap(authHttpClient.get<ApiBranch[]>("/api/branches"))).map(mapBranch);
}

export async function createBranch(values: BranchFormValues): Promise<Branch> {
  return mapBranch(await unwrap(authHttpClient.post<ApiBranch>("/api/branches", toRequest(values))));
}

export async function updateBranch(id: string, values: BranchFormValues): Promise<Branch> {
  return mapBranch(await unwrap(authHttpClient.put<ApiBranch>(`/api/branches/${encodeURIComponent(id)}`, toRequest(values))));
}

export async function deleteBranch(id: string): Promise<void> {
  await unwrap(authHttpClient.delete<void>(`/api/branches/${encodeURIComponent(id)}`));
}
