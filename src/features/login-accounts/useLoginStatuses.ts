import { useQuery } from "@tanstack/react-query";
import { getLoginAccountStatuses, type LoginAccountStatus } from "./api";

/**
 * The sign-in methods of the accounts linked to the people on a list, keyed by account id. It only decides whether a password reset is
 * offered, so when it cannot be loaded (no permission, offline) the list still works and simply offers no reset.
 */
export function useLoginStatuses(userIds: (string | undefined)[]): Map<string, LoginAccountStatus> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))].sort();
  const { data } = useQuery({
    queryKey: ["login-accounts", "status", ids],
    queryFn: () => getLoginAccountStatuses(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
    retry: false,
  });
  return new Map((data ?? []).map((s) => [s.userId, s]));
}
