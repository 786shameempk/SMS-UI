import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { useTranslation } from "react-i18next";

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
}

/** Search field with a leading icon and a clear button. Labelled by its placeholder for screen readers. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, placeholder: placeholderProp, className, containerClassName, ...props }, ref) => {
    const { t } = useTranslation("common");
    const placeholder = placeholderProp ?? t("Search…");
    return (
    <div className={cn("relative w-full sm:w-72", containerClassName)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={props["aria-label"] ?? (typeof placeholder === "string" ? placeholder.replace(/…|\.\.\./, "") : t("Search"))}
        className={cn("ps-9 pe-8 [&::-webkit-search-cancel-button]:hidden", className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={t("Clear search")}
          className="absolute end-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
