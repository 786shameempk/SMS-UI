import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listClasses, listSections } from "@/features/academics/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { listRosterSections } from "../../api";
import { statusToggleActiveClass } from "../../constants";
import MonthlyRegisterGrid from "./MonthlyRegisterGrid";
import { STATUS_LEGEND } from "./monthlyRegister";

const ALL = "all";

/**
 * The month as a register, class by class: pick one class and section, or "All classes" to get one register for every class and section the person may see.
 * Each register lists the students by name against the dates of the month.
 */
export default function MonthlyAttendanceReport() {
  const { t } = useTranslation("attendance");
  const { data: classes = [] } = useQuery({ queryKey: ["attendance", "classes"], queryFn: listClasses });
  const { data: sections = [] } = useQuery({ queryKey: ["attendance", "sections"], queryFn: listSections });
  const { data: rosterSections = [] } = useQuery({ queryKey: ["attendance", "roster-sections"], queryFn: listRosterSections });

  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const rosterClassIds = useMemo(() => new Set(rosterSections.map((r) => r.classId)), [rosterSections]);
  const rosterSectionIds = useMemo(() => new Set(rosterSections.map((r) => r.sectionId)), [rosterSections]);
  const availableClasses = useMemo(() => classes.filter((c) => rosterClassIds.has(c.id)), [classes, rosterClassIds]);
  const availableSections = useMemo(() => sections.filter((s) => s.classId === classId && rosterSectionIds.has(s.id)), [sections, classId, rosterSectionIds]);
  const allClasses = classId === ALL;

  useEffect(() => {
    if (!allClasses && availableClasses.length && !availableClasses.some((c) => c.id === classId)) setClassId(availableClasses[0].id);
  }, [availableClasses, classId, allClasses]);

  useEffect(() => {
    if (allClasses) return;
    if (availableSections.length) {
      if (!availableSections.some((s) => s.id === sectionId)) setSectionId(availableSections[0].id);
    } else if (sectionId) {
      setSectionId("");
    }
  }, [availableSections, sectionId, allClasses]);

  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? t("Class");
  const sectionName = (id: string) => sections.find((s) => s.id === id)?.name ?? "";

  // "All classes": every class and section that has students, in class then section order.
  const everySection = useMemo(
    () =>
      rosterSections
        .map((r) => ({ ...r, className: classes.find((c) => c.id === r.classId)?.name ?? "", sectionName: sections.find((s) => s.id === r.sectionId)?.name ?? "" }))
        .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.sectionName.localeCompare(b.sectionName, undefined, { numeric: true })),
    [rosterSections, classes, sections],
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>{t("Monthly attendance")}</CardTitle>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t("Class")}</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-40" aria-label={t("Class")}>
                <SelectValue placeholder={t("Class")} />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.length > 1 && <SelectItem value={ALL}>{t("All classes")}</SelectItem>}
                {availableClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!allClasses && (
            <div className="space-y-1.5">
              <Label>{t("Section")}</Label>
              <Select value={sectionId} onValueChange={setSectionId} disabled={!availableSections.length}>
                <SelectTrigger className="w-28" aria-label={t("Section")}>
                  <SelectValue placeholder={t("Section")} />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="monthly-report-month">{t("Month")}</Label>
            <Input id="monthly-report-month" type="month" value={monthValue} onChange={(e) => e.target.value && setMonthValue(e.target.value)} max={currentMonthValue} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t("Legend")}>
          {STATUS_LEGEND.map((l) => (
            <li key={l.status} className="flex items-center gap-1.5">
              <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px] font-semibold", statusToggleActiveClass(l.status))}>{l.code}</span>
              {t(l.label)}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded-sm bg-secondary" />
            {t("Not marked")}
          </li>
        </ul>

        {allClasses ? (
          everySection.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">{t("No classes with students yet.")}</p>
          ) : (
            everySection.map((s) => (
              <MonthlyRegisterGrid key={s.sectionId} sectionId={s.sectionId} label={`${s.className} / ${s.sectionName}`} year={year} month={month} studentCount={s.studentCount} />
            ))
          )
        ) : (
          <MonthlyRegisterGrid sectionId={sectionId} label={`${className(classId)} / ${sectionName(sectionId)}`} year={year} month={month} />
        )}
      </CardContent>
    </Card>
  );
}
