export interface ParsedRoute {
  path: string;
  page?: string;
  requires: string | null;
  line: number;
}
export interface ParsedNavItem {
  label: string;
  to: string;
  permissionKey: string | null;
  audience: string | null;
  badge: string | null;
  superAdminOnly: boolean;
}
export interface ParsedNav {
  core: ParsedNavItem[];
  sections: { title: string; permissionKey: string | null; items: ParsedNavItem[] }[];
}
export function parseRoutes(text: string): ParsedRoute[];
export function parseNav(text: string): ParsedNav;
export function jsxContents(text: string, name: string): string[];
export function extractFacts(text: string): Record<string, string[] | boolean>;
export function uniq(items: string[]): string[];
