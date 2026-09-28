import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  /** Light text for sections on a dark background. */
  inverted?: boolean;
  className?: string;
}

export default function SectionHeading({ eyebrow, title, description, align = "center", inverted, className }: SectionHeadingProps) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
          inverted ? "border-white/15 bg-white/5 text-brand-300" : "border-brand-200 bg-brand-50 text-brand-700",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", inverted ? "bg-brand-400" : "bg-brand-500")} />
        {eyebrow}
      </span>
      <h2
        className={cn(
          "mt-4 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl",
          inverted ? "text-white" : "text-slate-900",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-base leading-relaxed text-pretty", inverted ? "text-slate-300" : "text-slate-600")}>
          {description}
        </p>
      )}
    </div>
  );
}
