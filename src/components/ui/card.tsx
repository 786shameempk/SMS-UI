import * as React from "react";
import { cn } from "@/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lift slightly on hover — only for cards that are themselves clickable. */
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-border bg-card text-card-foreground shadow-xs",
      interactive && "transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-input",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

/**
 * Title/description stack. When it contains a <CardAction>, the header becomes a two-column row with
 * the action pinned top-right, so every card positions its header actions the same way.
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 p-[var(--space-card-padding)]",
      "has-[[data-slot=card-action]]:grid-cols-[1fr_auto]",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-card-title leading-snug", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-[13px] leading-5 text-muted-foreground", className)} {...props} />,
);
CardDescription.displayName = "CardDescription";

const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-action"
    className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end flex items-center gap-2", className)}
    {...props}
  />
));
CardAction.displayName = "CardAction";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-[var(--space-card-padding)] pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-[var(--space-card-padding)] pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
