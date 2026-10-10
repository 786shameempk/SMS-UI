import { getRoute, type AppRoute } from "@/app/routeRegistry";
import { canDoTask, canRead, explainRoleBlock, type Viewer } from "./access";
import { resolveNavigation, type NavigationAction, type ResolvedNavigation } from "./navigation";
import { queryTerms, searchArticles, tokenize } from "./search";
import type { HelpArticle, HelpTask } from "./types";

/**
 * Answers "how do I...?" and "take me to..." from the verified documentation and the route registry, with no language model.
 * It never invents a menu path, label or address: everything it says comes from an article or from the registry. When the
 * question is not clearly about a documented task it returns null and the question goes to the AI service as before.
 */

export interface ArticleRef {
  id: string;
  title: string;
  module: string;
}

export interface Choice {
  taskId: string;
  label: string;
  article: ArticleRef;
}

export type HelpReply =
  /** Steps for a documented task, with the screen to open when the reader may. */
  | { kind: "answer"; article: ArticleRef; label: string; steps: string[]; moreSteps: boolean; menuPath: string[] | null; navigation: ResolvedNavigation | null; action: NavigationAction | null; related: ArticleRef[] }
  /** "Take me to": go straight there (unless there are unsaved edits). */
  | { kind: "navigate"; label: string; navigation: Extract<ResolvedNavigation, { status: "ok" }>; action: NavigationAction; article: ArticleRef | null }
  /** The reader's account cannot open the screen; explains why and offers nothing restricted. */
  | { kind: "denied"; label: string; message: string; article: ArticleRef | null }
  /** More than one task could be meant. */
  | { kind: "choose"; question: string; choices: Choice[] }
  /** No single task, but these guides contain every word asked. */
  | { kind: "articles"; articles: ArticleRef[] };

const ref = (a: HelpArticle): ArticleRef => ({ id: a.id, title: a.title, module: a.module });

const NAVIGATE = /\b(take me|bring me|send me|navigate|go to|go back to|jump to|open|show me the (screen|page))\b/i;
const MAX_STEPS = 8;
/** A task is answered outright only when its wording covers the question this well. */
const CLEAR_MATCH = 0.8;
/** Guides are suggested only when the question has this many meaningful words, scoring this well against titles and task wording. */
const MIN_SUGGEST_TERMS = 2;
const MIN_SUGGEST_SCORE = 10;

/** How well a task's wording covers the question: its own words found, and the question's words explained. */
function phraseScore(query: Set<string>, phrase: string): number {
  const words = new Set(tokenize(phrase));
  if (words.size === 0 || query.size === 0) return 0;
  let common = 0;
  for (const w of words) if (query.has(w)) common++;
  if (common === 0) return 0;
  return 0.6 * (common / words.size) + 0.4 * (common / query.size);
}

export function taskScore(question: string, task: HelpTask): number {
  const q = new Set(queryTerms(question).map((t) => t.stem));
  return Math.max(...[task.label, ...task.phrases].map((p) => phraseScore(q, p)), 0);
}

/** The documented steps of an article: its first numbered list. */
export function firstSteps(article: HelpArticle): { steps: string[]; more: boolean } {
  const block = article.blocks.find((b) => b.type === "steps");
  if (!block || block.type !== "steps") return { steps: [], more: false };
  const text = (nodes: { t: string; v?: string; c?: unknown[] }[]): string => nodes.map((n) => (n.t === "text" || n.t === "code" ? (n.v ?? "") : text((n.c ?? []) as never))).join("");
  const all = block.items.map((i) => text(i.inline as never));
  return { steps: all.slice(0, MAX_STEPS), more: all.length > MAX_STEPS };
}

export interface HelpCatalogView {
  articles: HelpArticle[];
  tasks: (HelpTask & { articleId: string; moduleId: string })[];
}

export function answerHelpQuestion(question: string, viewer: Viewer, catalog: HelpCatalogView): HelpReply | null {
  const q = question.trim();
  if (q.length < 3 || !viewer.role) return null;
  const byId = new Map(catalog.articles.map((a) => [a.id, a] as const));
  const readable = (a: HelpArticle | undefined): a is HelpArticle => !!a && canRead(a.access, viewer);
  // What this reader's role may actually do: a parent or student is only ever shown what an article names for them.
  const permitted = (a: HelpArticle | undefined): a is HelpArticle => readable(a) && canDoTask(a.roles, viewer);

  // One meaningful word ("question", "first") must match a task's wording almost exactly: a word that merely appears in a
  // task phrase is not a request for that task, so it goes on to the AI service.
  const minScore = queryTerms(q).length < MIN_SUGGEST_TERMS ? CLEAR_MATCH : 0.5;
  const scored = catalog.tasks
    .map((t) => ({ task: t, article: byId.get(t.articleId), score: taskScore(q, t) }))
    .filter((x) => x.score >= minScore && readable(x.article))
    .sort((a, b) => b.score - a.score);
  const wantsNavigation = NAVIGATE.test(q);

  if (scored.length > 0) {
    const [best, second] = scored;
    const clear = best.score >= CLEAR_MATCH && (!second || best.score - second.score >= 0.15);
    // A task this reader's role does not do gets an explanation only: no steps, no screen, no link to the guide.
    if (clear && !permitted(best.article)) {
      return { kind: "denied", label: best.task.label, message: explainRoleBlock(best.task.label, best.article!.roles, viewer), article: null };
    }
    if (!clear) {
      // A partial match, or a near tie between tasks, is a question to ask back, not a guess.
      const allowed = scored.filter((x) => permitted(x.article));
      if (allowed.length === 0) {
        return { kind: "denied", label: best.task.label, message: explainRoleBlock(best.task.label, best.article!.roles, viewer), article: null };
      }
      const choices = allowed.slice(0, 4).map((x) => ({ taskId: x.task.id, label: x.task.label, article: ref(x.article!) }));
      return { kind: "choose", question: q, choices };
    }
    const article = best.article!;
    const routeId = best.task.route ?? article.route;
    const action: NavigationAction | null = routeId ? { type: "navigate", routeId, taskId: best.task.id, reason: best.task.label } : null;
    const navigation = action ? resolveNavigation(action, viewer) : null;

    if (navigation?.status === "denied") return { kind: "denied", label: best.task.label, message: navigation.message, article: null };
    if (wantsNavigation && navigation?.status === "ok") return { kind: "navigate", label: best.task.label, navigation, action: action!, article: ref(article) };

    const { steps, more } = firstSteps(article);
    const related = article.related.map((id) => byId.get(id)).filter(permitted).map(ref).slice(0, 3);
    const route: AppRoute | undefined = routeId ? getRoute(routeId) : undefined;
    return {
      kind: "answer",
      article: ref(article),
      label: best.task.label,
      steps,
      moreSteps: more,
      menuPath: navigation?.status === "ok" ? navigation.menuPath : route?.menuItem ? [route.label] : null,
      navigation: navigation?.status === "ok" ? navigation : null,
      action: navigation?.status === "ok" ? action : null,
      related,
    };
  }

  // No documented task: offer guides only when several meaningful words were asked and they land in titles or task wording.
  // A single common word ("first", "question") is not a help request, so it goes on to the AI service.
  if (queryTerms(q).length < MIN_SUGGEST_TERMS) return null;
  const hits = searchArticles(catalog.articles.filter(permitted), q, 3).filter((h) => h.score >= MIN_SUGGEST_SCORE);
  if (hits.length > 0) return { kind: "articles", articles: hits.map((h) => ref(h.article)) };
  return null;
}

