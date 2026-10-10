export type InlineNode = { t: "text"; v: string } | { t: "code"; v: string } | { t: "bold" | "italic"; c: InlineNode[] } | { t: "link"; href: string; c: InlineNode[] } | { t: "help"; id: string; c: InlineNode[] } | { t: "route"; id: string; c: InlineNode[] };
export type BlockNode = Record<string, unknown> & { type: string };
export function splitFrontMatter(text: string): { data: Record<string, unknown>; body: string };
export function parseFrontMatter(lines: string[]): Record<string, unknown>;
export function parseInline(src: string): InlineNode[];
export function inlineText(nodes: InlineNode[]): string;
export function parseBlocks(body: string): BlockNode[];
export function blocksText(blocks: BlockNode[]): string;
export function slugify(s: string): string;
