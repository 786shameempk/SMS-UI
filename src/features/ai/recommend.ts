/** Which AI features to suggest on the landing view: the one used last, then what the role usually comes for. */

/** What each role is most likely here for, best first. Features the user cannot use are skipped, so every list is a wish, not a promise. */
const RECOMMENDED_FOR_ROLE: Record<string, string[]> = {
  student: ["study", "learning", "ask"],
  parent: ["ask", "study"],
  teacher: ["tools", "assistant", "ask"],
  principal: ["insights", "at-risk", "analytics"],
  admin: ["insights", "at-risk", "analytics"],
  superAdmin: ["insights", "analytics", "usage"],
};
const DEFAULT_RECOMMENDED = ["ask", "insights"];
const MAX_RECOMMENDED = 3;
const LAST_FEATURE_KEY = "sms.ai.lastFeature";

export function readLastFeature(): string | null {
  try {
    return localStorage.getItem(LAST_FEATURE_KEY);
  } catch {
    return null;
  }
}

export function rememberFeature(value: string) {
  try {
    localStorage.setItem(LAST_FEATURE_KEY, value);
  } catch {
    /* private mode: recommendations just won't remember */
  }
}

/** The feature used last (if still available), then the role's usual ones, capped to a short row. */
export function recommend<T extends { value: string }>(sections: T[], role: string | undefined, lastUsed: string | null): { section: T; reason?: string }[] {
  const byValue = new Map(sections.map((s) => [s.value, s] as const));
  const picks: { section: T; reason?: string }[] = [];
  const add = (value: string | null | undefined, reason?: string) => {
    const section = value ? byValue.get(value) : undefined;
    if (section && !picks.some((p) => p.section.value === section.value)) picks.push({ section, reason });
  };
  add(lastUsed, "You used this last");
  for (const value of (role && RECOMMENDED_FOR_ROLE[role]) || DEFAULT_RECOMMENDED) add(value);
  if (picks.length === 0) add(sections[0]?.value);
  return picks.slice(0, MAX_RECOMMENDED);
}
