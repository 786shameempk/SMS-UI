import { cn } from "@/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Placeholder block. Tinted from the text colour (not a surface token) so it reads on page, card and muted backgrounds alike. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-foreground/[0.07]", className)} {...props} />;
}
