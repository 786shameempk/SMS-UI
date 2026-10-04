import { useRef, useState } from "react";
import { cn } from "@/utils/cn";
import type { DashboardContext } from "../sources/types";
import { GRID_CLASS, HEIGHT_CLASS, WIDTH_CLASS, moveOnto, moveVisible, packedWidthClasses, updateItem, type LayoutItem } from "../layout";
import type { WidgetEnv } from "../registry";
import type { DashboardWidgetConfig, DashboardWidgetId } from "../widgets";
import WidgetEditFrame from "./WidgetEditFrame";
import WidgetRenderer from "./WidgetRenderer";

/**
 * DashboardLayout: the responsive grid of the user's visible widgets, in their saved order and sizes.
 * One column on phones, six on tablets (narrow widgets pair up), twelve on desktop. Cards in a row stretch
 * to the tallest so the grid stays even.
 *
 * With `onEdit` it is in edit mode: widgets can be dragged onto each other's place, moved with buttons
 * (keyboard and touch), resized and hidden; every change is reported as the full new item list.
 */
export default function DashboardLayout({
  items,
  widgets,
  ctx,
  env,
  onEdit,
}: {
  /** Every item, visible or not, in order. */
  items: LayoutItem[];
  /** The effective widget configs (catalog + the school's settings). */
  widgets: readonly DashboardWidgetConfig[];
  ctx: DashboardContext;
  env: WidgetEnv;
  onEdit?: (items: LayoutItem[], announcement: string) => void;
}) {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const visible = items.filter((i) => i.visible && byId.has(i.id));
  const [dragId, setDragIdState] = useState<DashboardWidgetId | null>(null);
  // The drop handler reads the ref: drag events can fire before React re-renders with the new state.
  const dragRef = useRef<DashboardWidgetId | null>(null);
  const setDragId = (id: DashboardWidgetId | null) => {
    dragRef.current = id;
    setDragIdState(id);
  };
  const [overId, setOverId] = useState<DashboardWidgetId | null>(null);
  // Viewing: rows are filled to the edge. Editing: exact sizes, so what you resize is what you see.
  const packed = onEdit ? null : packedWidthClasses(visible);

  const name = (id: DashboardWidgetId) => byId.get(id)?.name ?? id;
  const positionText = (next: LayoutItem[], id: DashboardWidgetId) => {
    const shown = next.filter((i) => i.visible && byId.has(i.id));
    return `position ${shown.findIndex((i) => i.id === id) + 1} of ${shown.length}`;
  };

  return (
    <div className={GRID_CLASS} data-editing={onEdit ? "true" : undefined}>
      {visible.map((item, position) => {
        const config = byId.get(item.id)!;
        const widget = <WidgetRenderer config={config} item={item} ctx={ctx} env={env} />;
        return (
          <div key={item.id} data-widget={item.id} className={cn("col-span-1 min-w-0 [&>*]:h-full", packed ? packed[position] : WIDTH_CLASS[item.w], HEIGHT_CLASS[item.h])}>
            {onEdit ? (
              <WidgetEditFrame
                config={config}
                item={item}
                position={position}
                count={visible.length}
                isDragging={dragId === item.id}
                isDropTarget={dragId !== null && overId === item.id && dragId !== item.id}
                handlers={{
                  onMove: (direction) => {
                    const next = moveVisible(items, item.id, direction);
                    onEdit(next, `${config.name} moved to ${positionText(next, item.id)}.`);
                  },
                  onResize: (size) => onEdit(updateItem(items, item.id, size), `${config.name} resized.`),
                  onHide: () => onEdit(updateItem(items, item.id, { visible: false }), `${config.name} hidden.`),
                  onDragStart: () => setDragId(item.id),
                  onDragOver: () => setOverId(item.id),
                  onDrop: () => {
                    const dragged = dragRef.current;
                    if (dragged && dragged !== item.id && byId.get(dragged)?.configurable) {
                      const next = moveOnto(items, dragged, item.id);
                      onEdit(next, `${name(dragged)} moved to ${positionText(next, dragged)}.`);
                    }
                    setDragId(null);
                    setOverId(null);
                  },
                  onDragEnd: () => {
                    setDragId(null);
                    setOverId(null);
                  },
                }}
              >
                {widget}
              </WidgetEditFrame>
            ) : (
              widget
            )}
          </div>
        );
      })}
    </div>
  );
}
