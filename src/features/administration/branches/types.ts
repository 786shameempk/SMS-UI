export type BranchStatus = "active" | "inactive";

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: BranchStatus;
  createdAt: string;
}

export interface BranchFormValues {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: BranchStatus;
}
