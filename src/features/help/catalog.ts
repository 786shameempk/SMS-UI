import catalog from "virtual:help-catalog";
import { MODULES, getModule, type HelpModule, type HelpRole } from "@/app/routeRegistry";
import type { HelpArticle, HelpCatalog, HelpTask } from "./types";

export const helpCatalog: HelpCatalog = catalog;

const byId = new Map(catalog.articles.map((a) => [a.id, a] as const));

export const getArticle = (id: string): HelpArticle | undefined => byId.get(id);

/** Menu sections in the order the menu shows them; top-level modules are grouped as "Everyday". */
export const GROUP_ORDER = ["Everyday", "Academics", "Online Exams", "Human Resources", "Finance", "Campus Operations", "Engagement", "Insights", "Administration", "Platform", "Infrastructure"];

export const groupOf = (m: HelpModule): string => m.menu[0] ?? "Everyday";

export function modulesByGroup(modules: readonly HelpModule[] = MODULES): { group: string; modules: HelpModule[] }[] {
  const groups = new Map<string, HelpModule[]>();
  for (const m of modules) groups.set(groupOf(m), [...(groups.get(groupOf(m)) ?? []), m]);
  return [...groups.entries()]
    .sort(([a], [b]) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99))
    .map(([group, list]) => ({ group, modules: list }));
}

export const articlesOfModule = (articles: HelpArticle[], moduleId: string): HelpArticle[] =>
  articles.filter((a) => a.module === moduleId).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export const articlesForRole = (articles: HelpArticle[], role: HelpRole): HelpArticle[] => articles.filter((a) => a.roles.includes(role));

export const moduleTitle = (id: string): string => getModule(id)?.title ?? id;

export const taskById = (id: string): (HelpTask & { articleId: string; moduleId: string }) | undefined => catalog.tasks.find((t) => t.id === id);

export const KIND_LABEL: Record<HelpArticle["kind"], string> = {
  overview: "Overview",
  task: "How to",
  reference: "Reference",
  faq: "Questions",
  troubleshooting: "Troubleshooting",
};

export const KIND_ORDER: HelpArticle["kind"][] = ["overview", "task", "reference", "faq", "troubleshooting"];
