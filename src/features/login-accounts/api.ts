import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";

/** What the sign-in account linked to a person can do: an email means a password can be reset, a mobile number means a code sign-in. */
export interface LoginAccountStatus {
  userId: string;
  hasEmail: boolean;
  hasMobile: boolean;
}

/** Most the server answers for in one call; longer lists are fetched in chunks. */
const CHUNK = 500;

/** The sign-in methods of these accounts (this school's only); an id the school does not own simply comes back absent. */
export async function getLoginAccountStatuses(userIds: string[]): Promise<LoginAccountStatus[]> {
  const ids = [...new Set(userIds)];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
  try {
    const answers = await Promise.all(chunks.map((chunk) => authHttpClient.post<LoginAccountStatus[]>("/api/person-logins/status", { userIds: chunk })));
    return answers.flatMap((a) => a.data);
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}
