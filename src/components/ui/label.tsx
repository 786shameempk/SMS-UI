import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/utils/cn";
import { useTranslation } from "react-i18next";

interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Appends a red asterisk (and "required" for screen readers). */
  required?: boolean;
  /** Appends a muted "(optional)". */
  optional?: boolean;
}

const Label = React.forwardRef<React.ComponentRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 text-[13px] font-medium leading-5 text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      )}
      {required && <span className="sr-only"><LabelNote text="(required)" /></span>}
      {optional && <span className="text-xs font-normal text-muted-foreground"><LabelNote text="(optional)" /></span>}
    </LabelPrimitive.Root>
  ),
);
Label.displayName = LabelPrimitive.Root.displayName;

function LabelNote({ text }: { text: "(required)" | "(optional)" }) {
  const { t } = useTranslation("common");
  return text === "(required)" ? t("(required)") : t("(optional)");
}

export { Label };
