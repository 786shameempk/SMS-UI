import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Quiet second line (an email, a count). Searched too. */
  hint?: string;
  disabled?: boolean;
}

interface ComboboxProps {
  value: string | null;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Names the control for screen readers. */
  "aria-label": string;
  className?: string;
  disabled?: boolean;
}

/**
 * A select you can type into: the list filters as you type (label and hint), arrow keys move, Enter picks, Escape closes.
 * Use it instead of Select when a list can grow past what scanning allows, such as every parent login in a school.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  "aria-label": ariaLabel,
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  const selected = options.find((o) => o.value === value);
  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const choose = (option: ComboboxOption | undefined) => {
    if (!option || option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(shown[active]);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          className={cn(
            "flex h-9 w-56 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm text-left cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0">
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id={listId} role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto p-1">
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>}
          {shown.map((option, i) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(option)}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm",
                i === active && "bg-secondary",
                option.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Check className={cn("mt-0.5 h-4 w-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-foreground">{option.label}</span>
                {option.hint && <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
