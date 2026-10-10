import type { HelpArticle } from "./types";

/** Words that carry no meaning for finding help. */
const STOP = new Set(["a", "an", "the", "to", "of", "in", "on", "for", "and", "or", "is", "are", "do", "does", "i", "my", "me", "how", "can", "where", "what", "when", "why", "which", "it", "this", "that", "with", "from", "at", "by", "be", "we", "you", "your", "please", "want", "need", "like", "would", "should", "could", "show", "take", "go", "open", "find", "get", "see", "view"]);

/** Everyday words people use for the same action, mapped to one stem so "register a student" finds "add a student". */
const SYNONYMS: Record<string, string> = {
  create: "add", new: "add", register: "add", insert: "add", enter: "add", enrol: "add", enroll: "add", admit: "add",
  remove: "delete", erase: "delete", cancel: "delete",
  change: "edit", update: "edit", modify: "edit", fix: "edit",
  pay: "payment", paid: "payment", paying: "payment", fee: "fees", invoice: "fees",
  login: "signin", sign: "signin", forgot: "password", reset: "password", passwords: "password",
  pupil: "student", child: "student", kid: "student", children: "student",
  employee: "staff",
  mark: "attendance", present: "attendance", absent: "attendance",
  test: "exam", quiz: "exam",
  bus: "transport", route: "transport", driver: "transport",
  permission: "permissions", access: "permissions", role: "roles",
};

export function stem(word: string): string {
  let w = word.toLowerCase();
  if (SYNONYMS[w]) return SYNONYMS[w];
  if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (/(ches|shes|xes|zes|sses)$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (SYNONYMS[w]) return SYNONYMS[w];
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  return SYNONYMS[w] ?? w;
}

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w));

/** The meaningful words of a query, each with its stem (for whole-word matches) and its raw form (for typing-ahead). */
export function queryTerms(text: string): { stem: string; raw: string }[] {
  return words(text).map((raw) => ({ stem: stem(raw), raw }));
}

export const tokenize = (text: string): string[] => words(text).map(stem);

/** What an article is indexed under: every word as written and its stem, so "regist" and "register a student" both reach "add a student". */
function indexTokens(text: string): string[] {
  return words(text).flatMap((w) => [w, stem(w)]);
}

export interface SearchHit {
  article: HelpArticle;
  score: number;
  /** A short passage around the best match, for the result list. */
  snippet: string;
}

interface Weighted {
  title: Set<string>;
  keywords: Set<string>;
  phrases: Set<string>;
  headings: Set<string>;
  summary: Set<string>;
  body: Set<string>;
}

const indexCache = new WeakMap<HelpArticle, Weighted>();

function indexOf(a: HelpArticle): Weighted {
  let w = indexCache.get(a);
  if (!w) {
    w = {
      title: new Set(indexTokens(a.title)),
      keywords: new Set(a.keywords.flatMap(indexTokens)),
      phrases: new Set(a.tasks.flatMap((t) => [t.label, ...t.phrases]).flatMap(indexTokens)),
      headings: new Set(a.headings.flatMap((h) => indexTokens(h.text))),
      summary: new Set(indexTokens(a.summary)),
      body: new Set(indexTokens(a.text)),
    };
    indexCache.set(a, w);
  }
  return w;
}

const WEIGHTS: [keyof Weighted, number][] = [["title", 8], ["phrases", 7], ["keywords", 5], ["headings", 3], ["summary", 3], ["body", 1]];

function matches(set: Set<string>, term: { stem: string; raw: string }, prefix: boolean): boolean {
  if (set.has(term.stem) || set.has(term.raw)) return true;
  if (!prefix || term.raw.length < 3) return false;
  for (const w of set) if (w.startsWith(term.raw)) return true;
  return false;
}

function snippetFor(a: HelpArticle, tokens: string[]): string {
  const lines = a.text.split("\n").filter(Boolean);
  let best = { line: a.summary, hits: 0 };
  for (const line of lines) {
    const lt = new Set(tokenize(line));
    const hits = tokens.filter((t) => lt.has(t)).length;
    if (hits > best.hits) best = { line, hits };
  }
  const text = (best.line || a.summary).replace(/^\d+\.\s+/, "").trim();
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

/**
 * Ranks articles for a query. Every meaningful word must match somewhere (the last one may be a prefix, so results appear as
 * you type); matches in the title and task phrases count most. Articles are expected to be pre-filtered to what the viewer may read.
 */
export function searchArticles(articles: HelpArticle[], query: string, limit = 20): SearchHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const tokens = terms.map((t) => t.stem);
  const hits: SearchHit[] = [];
  for (const article of articles) {
    const w = indexOf(article);
    let score = 0;
    let all = true;
    for (const [i, term] of terms.entries()) {
      const prefix = i === terms.length - 1;
      let best = 0;
      let extra = 0;
      for (const [field, weight] of WEIGHTS) {
        if (!matches(w[field], term, prefix)) continue;
        if (weight > best) {
          extra += best ? 0.25 : 0;
          best = weight;
        } else extra += 0.25;
      }
      if (best === 0) {
        all = false;
        break;
      }
      score += best + Math.min(extra, 1);
    }
    if (!all) continue;
    if (article.kind === "task") score += 0.5;
    hits.push({ article, score, snippet: snippetFor(article, tokens) });
  }
  return hits.sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title)).slice(0, limit);
}
