import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/utils/cn";
import { ScrollArrow, useScrollStrip } from "./scroll-strip";

type TabsVariant = "pill" | "line";
const TabsVariantContext = React.createContext<TabsVariant>("pill");

const Tabs = TabsPrimitive.Root;

/** Scrolls `el` sideways just enough to be fully visible inside `container` (never scrolls the page vertically). */
function revealInline(container: HTMLElement, el: HTMLElement) {
  const pad = 24;
  const box = container.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const left = rect.left - box.left + container.scrollLeft;
  const right = left + rect.width;
  if (left - pad < container.scrollLeft) container.scrollLeft = Math.max(0, left - pad);
  else if (right + pad > container.scrollLeft + container.clientWidth) container.scrollLeft = right + pad - container.clientWidth;
}

/**
 * `pill` (default): a compact segmented control for in-card switches.
 * `line`: an underlined strip for a page's primary sections.
 * Both stay on one row. When the tabs don't fit they scroll sideways: by touch or trackpad, with the mouse wheel,
 * or with the arrow buttons that appear at an edge while more tabs are hidden past it. The active tab is scrolled into view.
 */
const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: TabsVariant }
>(({ className, variant = "pill", ...props }, forwardedRef) => {
  const { setRef, more, nudge } = useScrollStrip('[role="tab"][data-state="active"]', forwardedRef);

  return (
    <TabsVariantContext.Provider value={variant}>
      <div className={cn("relative min-w-0 max-w-full", variant === "line" ? "w-full" : "inline-flex")}>
        <TabsPrimitive.List
          ref={setRef}
          data-variant={variant}
          className={cn(
            "min-w-0 max-w-full items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            variant === "pill" && "inline-flex h-9 gap-1 rounded-lg bg-secondary p-1 text-secondary-foreground",
            variant === "line" && "flex w-full gap-1 shadow-[inset_0_-1px_0_var(--color-border)]",
            className,
          )}
          {...props}
        />
        {more.start && <ScrollArrow dir={-1} onClick={() => nudge(-1)} className={variant === "line" ? "-translate-y-[60%]" : undefined} />}
        {more.end && <ScrollArrow dir={1} onClick={() => nudge(1)} className={variant === "line" ? "-translate-y-[60%]" : undefined} />}
      </div>
    </TabsVariantContext.Provider>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Small, quiet count after the label (e.g. 1,248). Numbers are locale-formatted. */
  count?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, count, children, onFocus, ...props }, ref) => {
    const variant = React.useContext(TabsVariantContext);
    return (
      <TabsPrimitive.Trigger
        ref={ref}
        onFocus={(e) => {
          // Arrow-key navigation moves focus (and selection) along the strip; keep the focused tab visible.
          const list = e.currentTarget.parentElement;
          if (list) revealInline(list, e.currentTarget);
          onFocus?.(e);
        }}
        className={cn(
          "group/tab inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium text-muted-foreground transition-[color,background-color,border-color,box-shadow] duration-150 cursor-pointer [&_svg]:size-4 [&_svg]:shrink-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50",
          variant === "pill" &&
            "h-7 rounded-md px-3 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs",
          variant === "line" &&
            "relative h-10 rounded-t-md border-b-2 border-transparent px-3 hover:text-foreground hover:border-border data-[state=active]:border-primary data-[state=active]:text-foreground",
          className,
        )}
        {...props}
      >
        {children}
        {count !== undefined && count !== null && (
          <span
            className={cn(
              "min-w-5 rounded-full px-1.5 text-center text-[11px] font-medium leading-[18px] tabular-nums transition-colors",
              "bg-foreground/[0.06] text-muted-foreground",
              "group-data-[state=active]/tab:bg-accent group-data-[state=active]/tab:text-accent-foreground",
            )}
          >
            {typeof count === "number" ? count.toLocaleString() : count}
          </span>
        )}
      </TabsPrimitive.Trigger>
    );
  },
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-5 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
