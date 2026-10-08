import * as React from "react";
import { cn } from "@/utils/cn";

interface ToggleChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> {
  pressed: boolean;
  /** `default` for quick filters; `lg` for choices inside forms (e.g. picking an audience). */
  size?: "default" | "lg";
}

/**
 * A rounded on/off pill for quick filters ("All", "Classes", "Meetings") and multi-pick choices.
 * Wrap a set in `<div role="group" aria-label="…" className="flex flex-wrap gap-1.5">`.
 * Disabled chips keep pointer events so a `title` tooltip can still explain why.
 */
export const ToggleChip = React.forwardRef<HTMLButtonElement, ToggleChipProps>(
  ({ pressed, size = "default", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
        size === "lg" ? "h-8 px-3.5 text-sm [&_svg]:size-4 pointer-coarse:h-10" : "h-7 px-3 text-xs [&_svg]:size-3.5 pointer-coarse:h-9",
        pressed
          ? "border-primary/60 bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground enabled:hover:bg-secondary enabled:hover:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
ToggleChip.displayName = "ToggleChip";
