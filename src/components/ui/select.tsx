import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-start cursor-pointer data-[placeholder]:text-muted-foreground/80 [&>span]:truncate border border-input bg-card text-sm text-foreground shadow-xs placeholder:text-muted-foreground/80 transition-[border-color,box-shadow] duration-150 hover:border-muted-foreground/40 focus:outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1 text-muted-foreground", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1 text-muted-foreground", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

/** What the search box in an open list has typed; items use it to hide themselves. */
const SelectSearchContext = React.createContext("");

/** The visible text of an item, so the search can match it whatever the item renders. */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/**
 * Every list is searchable: a search box sits above the options and narrows them as you type. Options that don't match stay mounted
 * (so the trigger can still show the chosen value) but are hidden and skipped by the arrow keys.
 */
const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const { t } = useTranslation("common");
  const [query, setQuery] = React.useState("");
  const [noMatch, setNoMatch] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const shown = listRef.current?.querySelectorAll("[role=option]:not([data-filtered])").length ?? 0;
    setNoMatch(query.trim() !== "" && shown === 0);
  }, [query, children]);

  // Radix puts focus on the chosen option when the list opens; move it to the search box so typing searches
  // (not on touch screens, where it would raise the keyboard).
  React.useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) return;
    const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
        "max-h-[min(var(--radix-select-content-available-height),_24rem)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Radix would treat letters as type-ahead and jump focus to an option; keep them for the box. Arrows and Escape still reach the list.
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Escape") e.stopPropagation();
          }}
          placeholder={t("Search…")}
          aria-label={t("Search options")}
          autoComplete="off"
          className="h-9 w-full bg-transparent ps-9 pe-3 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        ref={listRef}
        className={cn("p-1", position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]")}
      >
        <SelectSearchContext.Provider value={query.trim().toLowerCase()}>{children}</SelectSearchContext.Provider>
        {noMatch && <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t("No matches")}</div>}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const query = React.useContext(SelectSearchContext);
  const filtered = query !== "" && !(props.textValue ?? textOf(children)).toLowerCase().includes(query);
  return (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 ps-8 pe-2 text-sm outline-none focus:bg-secondary focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      filtered && "hidden",
      className,
    )}
    {...props}
    disabled={props.disabled || filtered}
    data-filtered={filtered ? "" : undefined}
  >
    <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary-text" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("py-1.5 ps-8 pe-2 text-xs font-semibold text-muted-foreground", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
