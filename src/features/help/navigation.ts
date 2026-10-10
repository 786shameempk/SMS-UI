import { getRoute, menuPathOf, type AppRoute } from "@/app/routeRegistry";
import { canOpenRoute, explainNoAccess, type Viewer } from "./access";

/**
 * A request to take the user to a screen. It names a screen by its stable registry id, never by a URL: the address is looked up
 * here, from the application's own route table, so neither a user's words nor a model's output can send someone anywhere that
 * is not a registered, parameter-free screen of this app.
 */
export interface NavigationAction {
  type: "navigate";
  routeId: string;
  /** The documented task this came from, when there is one. */
  taskId?: string;
  /** Why the assistant is offering it, in words for the reader. */
  reason?: string;
}

export type ResolvedNavigation =
  | { status: "ok"; route: AppRoute; path: string; label: string; menuPath: string[] }
  | { status: "denied"; route: AppRoute; message: string }
  | { status: "invalid" };

/** Whether something received from outside (a server reply, say) is shaped like a navigation action. */
export function isNavigationAction(value: unknown): value is NavigationAction {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.type === "navigate" && typeof v.routeId === "string" && (v.taskId === undefined || typeof v.taskId === "string") && (v.reason === undefined || typeof v.reason === "string");
}

/**
 * Reads the navigation offers in a service reply. The service sends `null` for fields it leaves out, and anything that is not
 * shaped like a navigation action is dropped; at most one is kept, since an answer points to one place.
 */
export function parseNavigation(value: unknown): NavigationAction[] {
  if (!Array.isArray(value)) return [];
  const found: NavigationAction[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    const candidate = { type: v.type, routeId: v.routeId, taskId: v.taskId ?? undefined, reason: v.reason ?? undefined };
    if (isNavigationAction(candidate)) found.push(candidate);
  }
  return found.slice(0, 1);
}

/** Checks the action against the route registry and the reader's access. Anything unknown, or needing a record first, is "invalid". */
export function resolveNavigation(action: unknown, viewer: Viewer): ResolvedNavigation {
  if (!isNavigationAction(action)) return { status: "invalid" };
  const route = getRoute(action.routeId);
  if (!route || !route.deepLink) return { status: "invalid" };
  if (!canOpenRoute(route, viewer)) return { status: "denied", route, message: explainNoAccess(route, viewer) };
  return { status: "ok", route, path: route.path, label: route.label, menuPath: menuPathOf(route) };
}

// ── Unsaved edits ───────────────────────────────────────────────────────────
// Leaving a page can lose what someone typed into a form. The app has no central record of which forms are dirty, so
// this notes any edit made inside a form since the last navigation or submit. It errs on the cautious side: it can ask
// "leave anyway?" when nothing would be lost, never the other way round.

let edited = false;

export const hasUnsavedEdits = (): boolean => edited;
export const clearUnsavedEdits = (): void => {
  edited = false;
};

function isFormEdit(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-unsaved-ignore]")) return false;
  if (!target.matches("input, textarea, select, [contenteditable='true']")) return false;
  if (target instanceof HTMLInputElement && ["search", "button", "submit", "reset", "hidden"].includes(target.type)) return false;
  return Boolean(target.closest("form, [role='dialog']"));
}

/** Starts watching for edits; returns the function that stops. Mounted once, by the app shell. */
export function trackFormEdits(root: Document = document): () => void {
  const onEdit = (e: Event) => {
    if (isFormEdit(e.target)) edited = true;
  };
  const onSubmit = () => {
    edited = false;
  };
  root.addEventListener("input", onEdit, true);
  root.addEventListener("change", onEdit, true);
  root.addEventListener("submit", onSubmit, true);
  return () => {
    root.removeEventListener("input", onEdit, true);
    root.removeEventListener("change", onEdit, true);
    root.removeEventListener("submit", onSubmit, true);
  };
}
