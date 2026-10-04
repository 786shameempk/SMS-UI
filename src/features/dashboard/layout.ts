import {
  WIDGET_HEIGHTS,
  WIDGET_WIDTHS,
  type DashboardWidgetConfig,
  type DashboardWidgetId,
  type WidgetHeight,
  type WidgetWidth,
} from "./widgets";

/** One widget's place on a user's dashboard. */
export interface LayoutItem {
  id: DashboardWidgetId;
  visible: boolean;
  w: WidgetWidth;
  h: WidgetHeight;
}

/** What is persisted per user: items in display order. Unknown or no-longer-allowed ids are dropped on load. */
export interface SavedDashboardLayout {
  version: 1;
  items: LayoutItem[];
  updatedAt: string;
}

const defaultItem = (w: DashboardWidgetConfig): LayoutItem => ({ id: w.id, visible: w.defaultVisible, w: w.defaultWidth, h: w.defaultHeight });

/** The role's default dashboard: every allowed widget at its default place, size and visibility. */
export function defaultLayout(available: readonly DashboardWidgetConfig[]): LayoutItem[] {
  return [...available].sort((a, b) => a.defaultOrder - b.defaultOrder).map(defaultItem);
}

/**
 * Merges a saved layout with the widgets the viewer may see *now*:
 * - saved widgets the viewer has since lost access to (role, permission, admin switch) are dropped, so a
 *   stale layout can never bring back a widget they aren't allowed;
 * - widgets added since the layout was saved are slotted in next to their default neighbours;
 * - fixed (non-configurable) widgets keep their default size and visibility;
 * - sizes outside the allowed set fall back to the default.
 */
export function resolveLayout(available: readonly DashboardWidgetConfig[], saved?: SavedDashboardLayout | null): LayoutItem[] {
  if (!saved || saved.version !== 1 || !Array.isArray(saved.items)) return defaultLayout(available);

  const byId = new Map(available.map((w) => [w.id, w]));
  const seen = new Set<DashboardWidgetId>();
  const items: LayoutItem[] = [];
  for (const raw of saved.items) {
    const config = byId.get(raw?.id);
    if (!config || seen.has(config.id)) continue;
    seen.add(config.id);
    items.push(
      config.configurable
        ? {
            id: config.id,
            visible: typeof raw.visible === "boolean" ? raw.visible : config.defaultVisible,
            w: WIDGET_WIDTHS.includes(raw.w) ? raw.w : config.defaultWidth,
            h: WIDGET_HEIGHTS.includes(raw.h) ? raw.h : config.defaultHeight,
          }
        : defaultItem(config),
    );
  }

  // New widgets go right after the last placed widget that comes before them by default.
  for (const config of [...available].sort((a, b) => a.defaultOrder - b.defaultOrder)) {
    if (seen.has(config.id)) continue;
    let at = 0;
    items.forEach((item, index) => {
      if ((byId.get(item.id)?.defaultOrder ?? 0) < config.defaultOrder) at = index + 1;
    });
    items.splice(at, 0, defaultItem(config));
    seen.add(config.id);
  }
  return items;
}

/**
 * Narrows the client's available widgets to the ones the server allows, taking the school's defaults
 * (order, size, visibility, refresh) from the server. A widget the server doesn't list is never shown.
 */
export function applyServerWidgets(
  available: readonly DashboardWidgetConfig[],
  server: ReadonlyArray<Pick<DashboardWidgetConfig, "id" | "defaultVisible" | "defaultOrder" | "defaultWidth" | "defaultHeight" | "configurable" | "refreshInterval">>,
): DashboardWidgetConfig[] {
  const byId = new Map(server.map((w) => [w.id, w]));
  return available
    .filter((w) => byId.has(w.id))
    .map((w) => {
      const s = byId.get(w.id)!;
      return {
        ...w,
        defaultVisible: s.defaultVisible,
        defaultOrder: s.defaultOrder,
        defaultWidth: WIDGET_WIDTHS.includes(s.defaultWidth) ? s.defaultWidth : w.defaultWidth,
        defaultHeight: WIDGET_HEIGHTS.includes(s.defaultHeight) ? s.defaultHeight : w.defaultHeight,
        configurable: s.configurable,
        refreshInterval: Math.max(0, s.refreshInterval),
      };
    })
    .sort((a, b) => a.defaultOrder - b.defaultOrder);
}

export function toSavedLayout(items: readonly LayoutItem[], now = new Date()): SavedDashboardLayout {
  return { version: 1, items: items.map(({ id, visible, w, h }) => ({ id, visible, w, h })), updatedAt: now.toISOString() };
}

/** Moves an item to `toIndex` (clamped), keeping everything else in order. */
export function moveItem(items: readonly LayoutItem[], id: DashboardWidgetId, toIndex: number): LayoutItem[] {
  const from = items.findIndex((i) => i.id === id);
  if (from < 0) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, item);
  return next;
}

/**
 * Drag and drop: puts `id` where `targetId` is. Dragging forward lands after the target, backward before it -
 * the item takes the target's place either way.
 */
export function moveOnto(items: readonly LayoutItem[], id: DashboardWidgetId, targetId: DashboardWidgetId): LayoutItem[] {
  if (id === targetId) return [...items];
  const to = items.findIndex((i) => i.id === targetId);
  return to < 0 ? [...items] : moveItem(items, id, to);
}

/** Keyboard / button move: swaps with the previous or next *visible* widget (hidden ones don't take a step). */
export function moveVisible(items: readonly LayoutItem[], id: DashboardWidgetId, direction: -1 | 1): LayoutItem[] {
  const visible = items.filter((i) => i.visible);
  const at = visible.findIndex((i) => i.id === id);
  const neighbour = visible[at + direction];
  return at < 0 || !neighbour ? [...items] : moveOnto(items, id, neighbour.id);
}

export function updateItem(items: readonly LayoutItem[], id: DashboardWidgetId, patch: Partial<Omit<LayoutItem, "id">>): LayoutItem[] {
  return items.map((i) => (i.id === id ? { ...i, ...patch } : i));
}

/**
 * Row packing: given each card's span, widens the cards of any row that would otherwise end short (the next
 * card doesn't fit, or the list ends) so rows always reach the right edge. The spare columns are shared across
 * the row's cards (any remainder to the last ones), so a short row of two quarters becomes two halves rather than
 * a quarter and three quarters. Returns the span to render per card.
 */
export function fillRows(spans: readonly number[], columns: number): number[] {
  const out = spans.map((s) => Math.min(s, columns));
  let row: number[] = [];
  let used = 0;
  const close = () => {
    const spare = columns - used;
    if (spare > 0 && row.length > 0) {
      const each = Math.floor(spare / row.length);
      const extra = spare % row.length;
      row.forEach((idx, k) => (out[idx] += each + (k >= row.length - extra ? 1 : 0)));
    }
    row = [];
    used = 0;
  };
  out.forEach((s, i) => {
    if (used + s > columns) close();
    row.push(i);
    used += s;
    if (used === columns) close();
  });
  close();
  return out;
}

/** A width's span on the 6-column tablet grid. */
export const TABLET_SPAN: Record<WidgetWidth, number> = { 3: 3, 4: 3, 6: 6, 8: 6, 12: 6 };

// Every span as a literal so Tailwind generates it.
const XL_SPAN_CLASS = ["", "xl:col-span-1", "xl:col-span-2", "xl:col-span-3", "xl:col-span-4", "xl:col-span-5", "xl:col-span-6", "xl:col-span-7", "xl:col-span-8", "xl:col-span-9", "xl:col-span-10", "xl:col-span-11", "xl:col-span-12"];
const MD_SPAN_CLASS = ["", "md:col-span-1", "md:col-span-2", "md:col-span-3", "md:col-span-4", "md:col-span-5", "md:col-span-6"];

/** Grid classes for each visible item, with rows filled to the edge on tablet and desktop. */
export function packedWidthClasses(items: readonly LayoutItem[]): string[] {
  const xl = fillRows(items.map((i) => i.w), 12);
  const md = fillRows(items.map((i) => TABLET_SPAN[i.w]), 6);
  return items.map((_, i) => `${MD_SPAN_CLASS[md[i]]} ${XL_SPAN_CLASS[xl[i]]}`);
}

// ── Grid classes (static strings so Tailwind sees them) ─────────────────

/** Phones: one column. Tablets: 6 columns (narrow widgets pair up). Desktop: the full 12. */
export const GRID_CLASS = "grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12";

export const WIDTH_CLASS: Record<WidgetWidth, string> = {
  3: "md:col-span-3 xl:col-span-3",
  4: "md:col-span-3 xl:col-span-4",
  6: "md:col-span-6 xl:col-span-6",
  8: "md:col-span-6 xl:col-span-8",
  12: "md:col-span-6 xl:col-span-12",
};

export const HEIGHT_CLASS: Record<WidgetHeight, string> = {
  1: "",
  2: "md:min-h-[320px]",
  3: "md:min-h-[440px]",
};

/** Skeleton height per row hint, so loading cards hold roughly the space the real card takes. */
export const HEIGHT_PX: Record<WidgetHeight, number> = { 1: 220, 2: 320, 3: 440 };

export const WIDTH_LABEL: Record<WidgetWidth, string> = { 3: "Quarter", 4: "Third", 6: "Half", 8: "Two-thirds", 12: "Full width" };
export const HEIGHT_LABEL: Record<WidgetHeight, string> = { 1: "Compact", 2: "Tall", 3: "Extra tall" };
