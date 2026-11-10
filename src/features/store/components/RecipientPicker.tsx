import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { listClasses, listDepartments } from "@/features/academics/api";
import { listStaff } from "@/features/staff/api";
import { listStudents } from "@/features/students/api";
import { listTeachers } from "@/features/teachers/api";
import { RECIPIENT_LABEL } from "../constants";
import { SelectField, options } from "../shared";
import type { RecipientType } from "../types";

export interface Recipient {
  type: RecipientType;
  id: string | null;
  name: string;
  detail: string | null;
}

export const emptyRecipient = (type: RecipientType = "Student"): Recipient => ({ type, id: null, name: "", detail: null });

/** People and places in the school the items can go to. Students, staff, departments and classes come from their own modules; laboratories and facilities are typed in. */
export function useRecipientOptions(type: RecipientType, enabled = true): { options: ComboboxOption[]; detail: Record<string, string | null>; typed: boolean; loading: boolean } {
  const students = useQuery({ queryKey: ["store", "recipients", "students"], queryFn: listStudents, enabled: enabled && type === "Student", staleTime: 5 * 60_000 });
  const teachers = useQuery({ queryKey: ["store", "recipients", "teachers"], queryFn: listTeachers, enabled: enabled && type === "Teacher", staleTime: 5 * 60_000 });
  const staff = useQuery({ queryKey: ["store", "recipients", "staff"], queryFn: listStaff, enabled: enabled && type === "Staff", staleTime: 5 * 60_000 });
  const departments = useQuery({ queryKey: ["store", "recipients", "departments"], queryFn: listDepartments, enabled: enabled && type === "Department", staleTime: 5 * 60_000 });
  const classes = useQuery({ queryKey: ["store", "recipients", "classes"], queryFn: listClasses, enabled: enabled && type === "Class", staleTime: 5 * 60_000 });
  const detail: Record<string, string | null> = {};
  let list: ComboboxOption[] = [];
  if (type === "Student") {
    list = (students.data ?? []).filter((s) => !s.status || s.status === "active").map((s) => {
      const d = [s.className && `${s.className}${s.section ? ` ${s.section}` : ""}`, s.admissionNumber].filter(Boolean).join(" · ");
      detail[s.id] = s.className ? `${s.className}${s.section ? ` ${s.section}` : ""}` : null;
      return { value: s.id, label: `${s.firstName} ${s.lastName}`.trim(), hint: d };
    });
  } else if (type === "Teacher" || type === "Staff") {
    list = ((type === "Teacher" ? teachers.data : staff.data) ?? []).filter((s) => s.status === "active").map((s) => {
      detail[s.id] = s.department || null;
      return { value: s.id, label: `${s.firstName} ${s.lastName}`.trim(), hint: [s.employeeId, s.department].filter(Boolean).join(" · ") };
    });
  } else if (type === "Department") {
    list = (departments.data ?? []).map((d) => ({ value: d.id, label: d.name }));
  } else if (type === "Class") {
    list = (classes.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  }
  const typed = type === "Laboratory" || type === "Facility" || type === "Other";
  return { options: list, detail, typed, loading: students.isLoading || teachers.isLoading || staff.isLoading || departments.isLoading || classes.isLoading };
}

/** Picks who the items are for: the kind of recipient, then the person or place. */
export default function RecipientPicker({ value, onChange, idPrefix = "recipient" }: { value: Recipient; onChange: (r: Recipient) => void; idPrefix?: string }) {
  const { t } = useTranslation("store");
  const { options: list, detail, typed } = useRecipientOptions(value.type);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <span className="mb-1 block text-sm font-medium">{t("Issue to")}</span>
        <SelectField value={value.type} onChange={(type) => onChange(emptyRecipient(type ?? "Student"))} items={options(RECIPIENT_LABEL)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${idPrefix}-name`}>{t("Recipient")}</label>
        {typed ? (
          <Input id={`${idPrefix}-name`} value={value.name} onChange={(e) => onChange({ ...value, id: null, name: e.target.value })} placeholder={value.type === "Laboratory" ? t("Physics lab") : t("Name of the place or person")} maxLength={200} />
        ) : (
          <Combobox
            id={`${idPrefix}-name`}
            aria-label={t("Recipient")}
            value={value.id}
            onValueChange={(id) => { const o = list.find((x) => x.value === id); onChange({ ...value, id, name: o?.label ?? "", detail: detail[id] ?? null }); }}
            options={list}
            placeholder={t("Choose")}
          />
        )}
      </div>
    </div>
  );
}
