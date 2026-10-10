import type { HelpAccess, HelpModule, HelpRole } from "@/app/routeRegistry";

/** Inline text in an article. `help` and `route` are links to another article or to a screen, resolved at render time. */
export type Inline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "bold" | "italic"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "help"; id: string; c: Inline[] }
  | { t: "route"; id: string; c: Inline[] };

export type CalloutKind = "note" | "tip" | "warning" | "important";

export type Block =
  | { type: "heading"; level: number; id: string; text: string }
  | { type: "p"; inline: Inline[] }
  | { type: "steps"; items: { inline: Inline[]; notes: Inline[][] }[] }
  | { type: "list"; items: Inline[][] }
  | { type: "table"; head: Inline[][]; rows: Inline[][][] }
  | { type: "callout"; kind: CalloutKind; inline: Inline[] }
  | { type: "image"; alt: string; shot: string; caption: string; file: string | null }
  | { type: "hr" };

export type ArticleKind = "overview" | "task" | "reference" | "faq" | "troubleshooting";
export type ArticleStatus = "draft" | "reviewed" | "verified";

export interface HelpTask {
  id: string;
  label: string;
  phrases: string[];
  /** Route id the task opens; resolved against the registry, never taken from user or model text. */
  route: string | null;
  hint: string | null;
  /** Roles the task is for (its article's roles); a parent or student is only offered tasks that name them. */
  roles?: HelpRole[];
}

export interface HelpArticle {
  id: string;
  title: string;
  module: string;
  kind: ArticleKind;
  access: HelpAccess;
  roles: HelpRole[];
  route: string | null;
  summary: string;
  related: string[];
  keywords: string[];
  tasks: HelpTask[];
  order: number;
  status: ArticleStatus;
  verifiedOn: string | null;
  /** The automated browser test that walks this workflow, if one exists. */
  e2e: string;
  screenshots: string[];
  video: string | null;
  headings: { id: string; text: string; level: number }[];
  blocks: Block[];
  /** The article as plain text, for search and the AI index. */
  text: string;
  /** Repo path of the Markdown source. */
  source: string;
}

export interface HelpScreenshot {
  id: string;
  file: string;
  alt: string;
  viewport: "desktop" | "tablet" | "mobile";
  route?: string;
  capturedOn: string;
  /** "playwright" when taken by the capture script, "manual" when a person captured it. */
  source: "playwright" | "manual";
  /** Always "synthetic": real student, staff or financial data must never appear in help images. */
  dataset: "synthetic";
}

export interface HelpVideo {
  id: string;
  title: string;
  /** MP4 URL (object storage or CDN); never a file in the repository. */
  url: string;
  poster?: string;
  captions?: string;
  durationSeconds?: number;
  recordedOn: string;
}

export interface HelpCatalog {
  appVersion: string;
  /** Short hash of every article, so a rebuilt PDF or index can be matched to the content it came from. */
  revision: string;
  modules: readonly HelpModule[];
  articles: HelpArticle[];
  tasks: (HelpTask & { articleId: string; moduleId: string })[];
  screenshots: HelpScreenshot[];
  videos: HelpVideo[];
}
