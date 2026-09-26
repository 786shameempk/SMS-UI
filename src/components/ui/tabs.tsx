import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/utils/cn";

type TabsVariant = "pill" | "line";
const TabsVariantContext = React.createContext<TabsVariant>("pill");

const Tabs = TabsPrimitive.Root;

/**
 * `pill` (default): a compact segmented control for in-card switches.
 * `line`: an underlined strip for a page's primary sections.
 * Both scroll horizontally instead of wrapping, so long tab sets stay one row on phones.
 */
const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: TabsVariant }
>(({ className, variant = "pill", ...props }, ref) => (
  <TabsVariantContext.Provider value={variant}>
    <TabsPrimitive.List
      ref={ref}
      data-variant={variant}
      className={cn(
        "max-w-full items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        variant === "pill" && "inline-flex h-9 gap-1 rounded-lg bg-secondary p-1 text-secondary-foreground",
        variant === "line" && "flex w-full gap-1 shadow-[inset_0_-1px_0_var(--color-border)]",
        className,
      )}
      {...props}
    />
  </TabsVariantContext.Provider>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors cursor-pointer [&_svg]:size-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50",
        variant === "pill" &&
          "h-7 rounded-md px-3 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs",
        variant === "line" &&
          "relative h-10 rounded-t-md border-b-2 border-transparent px-3 hover:text-foreground hover:border-border data-[state=active]:border-primary data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
});
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
