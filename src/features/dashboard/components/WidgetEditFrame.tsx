import type { DragEvent, ReactNode } from "react";
import { ArrowDown, ArrowUp, EyeOff, GripVertical, Lock, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { HEIGHT_LABEL, WIDTH_LABEL, type LayoutItem } from "../layout";
import { WIDGET_HEIGHTS, WIDGET_WIDTHS, type DashboardWidgetConfig, type WidgetHeight, type WidgetWidth } from "../widgets";

export interface WidgetEditHandlers {
  onMove: (direction: -1 | 1) => void;
  onResize: (size: { w?: WidgetWidth; h?: WidgetHeight }) => void;
  onHide: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

/**
 * A widget in edit mode: a toolbar to drag, move, resize or hide it, over the live widget (made inert so its
 * links and buttons don't fire while arranging). Fixed widgets get a "Fixed" badge and no controls.
 */
export default function WidgetEditFrame({
  config,
  item,
  position,
  count,
  isDragging,
  isDropTarget,
  handlers,
  children,
}: {
  config: DashboardWidgetConfig;
  item: LayoutItem;
  /** 0-based position among the visible widgets. */
  position: number;
  count: number;
  isDragging: boolean;
  isDropTarget: boolean;
  handlers: WidgetEditHandlers;
  children: ReactNode;
}) {
  const movable = config.configurable;
  const drag = movable
    ? {
        draggable: true,
        onDragStart: (e: DragEvent) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", config.id);
          handlers.onDragStart();
        },
        onDragEnd: handlers.onDragEnd,
      }
    : {};

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-xl outline-2 outline-offset-2 transition-[outline-color,opacity]",
        movable ? "outline-dashed outline-primary/35" : "outline-dotted outline-border",
        isDropTarget && "outline-solid outline-primary",
        isDragging && "opacity-40",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        handlers.onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        handlers.onDrop();
      }}
      {...drag}
    >
      <div className="mb-2 flex items-center gap-1 rounded-lg border border-border bg-card px-1.5 py-1 shadow-xs">
        {movable ? (
          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" aria-hidden="true" />
        ) : (
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{config.name}</span>
        {movable ? (
          <>
            <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">
              {WIDTH_LABEL[item.w]} · {HEIGHT_LABEL[item.h]}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={position === 0} onClick={() => handlers.onMove(-1)} aria-label={`Move ${config.name} earlier`}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={position === count - 1} onClick={() => handlers.onMove(1)} aria-label={`Move ${config.name} later`}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Resize ${config.name}`}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Width</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(item.w)} onValueChange={(v) => handlers.onResize({ w: Number(v) as WidgetWidth })}>
                  {WIDGET_WIDTHS.map((w) => (
                    <DropdownMenuRadioItem key={w} value={String(w)}>
                      {WIDTH_LABEL[w]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Height</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(item.h)} onValueChange={(v) => handlers.onResize({ h: Number(v) as WidgetHeight })}>
                  {WIDGET_HEIGHTS.map((h) => (
                    <DropdownMenuRadioItem key={h} value={String(h)}>
                      {HEIGHT_LABEL[h]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlers.onHide} aria-label={`Hide ${config.name}`}>
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fixed</span>
        )}
      </div>
      {/* The real widget, as a preview: inert so arranging never follows a link or presses a button inside it. */}
      <div inert className="min-h-0 flex-1 select-none [&>*]:h-full">
        {children}
      </div>
    </div>
  );
}
