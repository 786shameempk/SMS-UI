import { cn } from "@/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300",
  danger: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  neutral: "bg-muted text-muted-foreground",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
