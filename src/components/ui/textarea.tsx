import * as React from "react";
import { cn } from "@/utils/cn";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[84px] w-full rounded-lg px-3 py-2 leading-relaxed border border-input bg-card text-sm text-foreground shadow-xs placeholder:text-muted-foreground/80 transition-[border-color,box-shadow] duration-150 hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
