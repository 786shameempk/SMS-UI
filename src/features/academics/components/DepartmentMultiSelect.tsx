import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";
import { listDepartments } from "../api";

/**
 * Pick any number of departments from the school's department master (Academic setup > Departments), including none. The first one
 * picked is the person's main department. A department saved earlier that has since been removed stays listed so editing an old
 * record does not silently drop it.
 */
export default function DepartmentMultiSelect({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  invalid?: boolean;
}) {
  const { t } = useTranslation("academics");
  const { data: departments = [], isLoading } = useQuery({ queryKey: ["academics", "departments"], queryFn: listDepartments });
  const names = departments.map((d) => d.name);
  const options = [...value.filter((v) => !names.includes(v)), ...names];

  if (!isLoading && options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("No departments set up yet")}. {t("Add departments in Academic setup first.")}{" "}
        <Link to="/academics" className="font-medium text-primary-text underline-offset-4 hover:underline">
          {t("Open Academic setup")}
        </Link>
      </p>
    );
  }

  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  const summary = value.length === 0 ? t("None") : value.join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-invalid={invalid ? true : undefined}
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-1.5 text-start text-sm shadow-xs transition-[border-color,box-shadow] hover:border-muted-foreground/40 focus:outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20 aria-invalid:border-destructive",
            value.length === 0 && "text-muted-foreground/80",
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-1">
        <div className="max-h-56 overflow-y-auto">
          {options.map((name) => (
            <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60">
              <Checkbox checked={value.includes(name)} onCheckedChange={() => toggle(name)} />
              <span className="min-w-0 flex-1 truncate">{name}</span>
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <button type="button" className="mt-1 w-full rounded-md px-2 py-1.5 text-start text-xs text-muted-foreground hover:bg-secondary/60" onClick={() => onChange([])}>
            {t("Clear selection (no department)")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
