import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

/** Error line under a field. `data-slot="field-error"` lets index.css paint the sibling input red. */
export function FieldError({ children, className, id }: { children?: React.ReactNode; className?: string; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} data-slot="field-error" role="alert" className={cn("flex items-center gap-1 text-xs text-destructive-strong", className)}>
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Label → control → hint/error, with consistent spacing. */
export function FormField({ label, htmlFor, required, optional, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required} optional={optional}>
          {label}
        </Label>
      )}
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <p className="text-helper">{hint}</p> : null}
    </div>
  );
}

/** Groups related fields under a small heading, e.g. "Personal information" / "Contact". */
export function FormSection({
  title,
  description,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  // role="group" + aria-labelledby gives screen readers the grouping of a fieldset without the
  // legend-on-the-border rendering quirk.
  return (
    <section role="group" aria-labelledby={id} className={cn("space-y-4 border-t border-border pt-5 first:border-t-0 first:pt-0", className)}>
      <div className="space-y-0.5">
        <h3 id={id} className="text-overline">
          {title}
        </h3>
        {description && <p className="text-helper">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Two-up field row that collapses to one column on narrow panels/phones. */
export function FormRow({ className, cols = 2, ...props }: React.HTMLAttributes<HTMLDivElement> & { cols?: 2 | 3 }) {
  return <div className={cn("grid grid-cols-1 gap-4", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3", className)} {...props} />;
}
