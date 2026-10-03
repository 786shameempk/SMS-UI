import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: LucideIcon;
  /** Quiet count after the label, like TabsTrigger's. */
  count?: number;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Required: names the group for screen readers ("Status", "Filter widgets"). */
  "aria-label": string;
  size?: "sm" | "default";
  className?: string;
}

/**
 * Single-choice switch for filtering or changing a view in place, styled like the `pill` TabsList.
 * Use Tabs when each choice owns its own panel of content; use this when the choice filters what's already
 * shown. A radiogroup: one Tab stop, arrow keys move and select.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "default",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const jump = e.key === "Home" ? enabled[0] : e.key === "End" ? enabled[enabled.length - 1] : undefined;
    if (!step && jump === undefined) return;
    e.preventDefault();
    const pos = enabled.indexOf(index);
    const next = jump ?? enabled[(pos + step + enabled.length) % enabled.length];
    refs.current[next]?.focus();
    onValueChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-secondary p-1 text-secondary-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        size === "sm" ? "h-8" : "h-9",
        className,
      )}
    >
      {options.map((o, i) => {
        const checked = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            data-state={checked ? "on" : "off"}
            disabled={o.disabled}
            tabIndex={checked ? 0 : -1}
            onClick={() => onValueChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "group/seg inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium text-muted-foreground transition-[color,background-color,box-shadow] duration-150 cursor-pointer",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50",
              "data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs",
              size === "sm" ? "h-6 px-2.5 text-xs [&_svg]:size-3.5" : "h-7 px-3 text-sm [&_svg]:size-4",
            )}
          >
            {Icon && <Icon aria-hidden="true" />}
            {o.label}
            {o.count !== undefined && (
              <span className="min-w-5 rounded-full bg-foreground/[0.06] px-1.5 text-center text-[11px] leading-[18px] tabular-nums text-muted-foreground group-data-[state=on]/seg:bg-accent group-data-[state=on]/seg:text-accent-foreground">
                {o.count.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
