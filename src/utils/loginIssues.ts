import toast from "react-hot-toast";

/**
 * The school's records are saved even when a person's sign-in account could not be made or linked. Say so right away, in the
 * server's words, so the admin does not find a missing account later. Uses the "common" namespace's plain strings.
 */
export function notifyLoginIssues(created: { loginIssues?: string[] } | undefined, heading: string) {
  const issues = created?.loginIssues ?? [];
  if (issues.length === 0) return;
  toast(`${heading} ${issues.join(" ")}`, { icon: "⚠️", duration: 12000 });
}
