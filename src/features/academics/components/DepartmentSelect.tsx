import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listDepartments } from "../api";

/** Radix Select cannot hold an empty item value, so "no department" is this stand-in. */
const NONE = "__none__";

/**
 * Pick a department from the school's department master (Academic setup > Departments): the one place departments are defined, so
 * staff and users can never be given a department that does not exist. A department saved earlier that has since been removed stays
 * selectable (so editing an old record does not silently drop it). With no departments set up yet it says so and points to where
 * to add them, instead of offering a free-text box.
 */
export default function DepartmentSelect({
  id,
  value,
  onChange,
  invalid,
  allowNone,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  invalid?: boolean;
  /** Offer "No department" (for forms where the department is optional). */
  allowNone?: boolean;
}) {
  const { t } = useTranslation("academics");
  const { data: departments = [], isLoading } = useQuery({ queryKey: ["academics", "departments"], queryFn: listDepartments });
  const current = value ?? "";
  const names = departments.map((d) => d.name);
  const options = current && !names.includes(current) ? [current, ...names] : names;

  if (!isLoading && options.length === 0) {
    return (
      <div className="space-y-1.5">
        <Select disabled>
          <SelectTrigger id={id} aria-invalid={invalid ? true : undefined}>
            <SelectValue placeholder={t("No departments set up yet")} />
          </SelectTrigger>
          <SelectContent />
        </Select>
        <p className="text-xs text-muted-foreground">
          {t("Add departments in Academic setup first.")}{" "}
          <Link to="/academics" className="font-medium text-primary-text underline-offset-4 hover:underline">
            {t("Open Academic setup")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <Select value={current === "" && allowNone ? NONE : current} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
      <SelectTrigger id={id} aria-invalid={invalid ? true : undefined}>
        <SelectValue placeholder={t("Select a department")} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>{t("No department")}</SelectItem>}
        {options.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
