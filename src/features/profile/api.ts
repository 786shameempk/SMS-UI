import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";

export type ProfileStatus = "Incomplete" | "PendingApproval" | "ChangesRequested" | "Approved";

export interface ProfileField {
  key: string;
  label: string;
  group: string;
  kind: "text" | "textarea" | "date" | "select" | "phone" | "email";
  value: string | null;
  editable: boolean;
  sensitive: boolean;
  required: boolean;
  missing: boolean;
  options: string[] | null;
}

export interface ProfileFeedback {
  decision: "Approved" | "ChangesRequested";
  reason: string | null;
  decidedAt: string;
  decidedBy: string | null;
}

export interface Profile {
  personType: "staff" | "student";
  personId: string;
  displayName: string;
  subtitle: string;
  relation: "self" | "child";
  status: ProfileStatus;
  locked: boolean;
  submittedAt: string | null;
  version: number;
  fields: ProfileField[];
  missingFields: string[];
  feedback: ProfileFeedback | null;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export const listMyProfiles = () => unwrap(academicHttpClient.get<Profile[]>("/api/my-profile"));

export const saveProfile = (profile: Pick<Profile, "personType" | "personId">, values: Record<string, string | null>) =>
  unwrap(academicHttpClient.put<Profile>(`/api/my-profile/${profile.personType}/${profile.personId}`, { values }));

export const submitProfile = (profile: Pick<Profile, "personType" | "personId">) =>
  unwrap(academicHttpClient.post<Profile>(`/api/my-profile/${profile.personType}/${profile.personId}/submit`));
