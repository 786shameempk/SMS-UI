import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { listStudents } from "@/features/students/api";
import { listStaff } from "@/features/staff/api";
import type { PersonType } from "./types";

import { useTranslation } from "react-i18next";
/** Pick a student or staff member by name, with admission / employee number as the hint. */
export default function PersonPicker({
  personType,
  value,
  onChange,
  ariaLabel,
}: {
  personType: PersonType;
  value: string | null;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation("attendance");
  const students = useQuery({ queryKey: ["attendance-methods", "students"], queryFn: listStudents, enabled: personType === "student", staleTime: 60_000 });
  const staff = useQuery({ queryKey: ["attendance-methods", "staff"], queryFn: listStaff, enabled: personType === "staff", staleTime: 60_000 });
  const options = useMemo(
    () =>
      personType === "student"
        ? (students.data ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}`, hint: s.admissionNumber }))
        : (staff.data ?? []).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}`, hint: s.employeeId })),
    [personType, students.data, staff.data],
  );
  return (
    <Combobox
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={personType === "student" ? t("Choose a student") : t("Choose a staff member")}
      searchPlaceholder="Search by name or number…"
      aria-label={ariaLabel}
    />
  );
}
