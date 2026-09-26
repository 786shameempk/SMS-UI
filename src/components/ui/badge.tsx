import { cn } from "@/utils/cn";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "brand";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Leading status dot — helps colour-blind users and makes status columns easier to scan. */
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-secondary text-secondary-foreground ring-border",
  success: "bg-success-soft text-success-strong ring-success/20",
  warning: "bg-warning-soft text-warning-strong ring-warning/25",
  danger: "bg-destructive-soft text-destructive-strong ring-destructive/20",
  info: "bg-info-soft text-info-strong ring-info/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  brand: "bg-accent text-accent-foreground ring-primary/25",
};

const dotClasses: Record<BadgeVariant, string> = {
  default: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/70",
  brand: "bg-primary",
};

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium leading-5 ring-1 ring-inset",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClasses[variant])} />}
      {children}
    </span>
  );
}
