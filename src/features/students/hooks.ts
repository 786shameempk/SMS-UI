import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listClasses, listSections } from "@/features/academics/api";

const byNaturalName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/**
 * Class/section pickers for the students feature, sourced from the Academic Setup module's real
 * `Class`/`Section` records (not a hardcoded list), so whatever names the school configured there
 * are exactly what `resolveSectionId` in api.ts can match. Pass a `branchId` to scope the options
 * to that branch — the backend rejects a section that lives in a different branch than the student.
 */
export function useClassSectionOptions(branchId?: string) {
  const { data: classes = [], isLoading: classesLoading } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });

  const scopedClasses = useMemo(
    () => (branchId ? classes.filter((c) => c.branchId === branchId) : classes),
    [classes, branchId],
  );

  /** Unique class names in natural order ("Class 2" before "Class 10") — also the promotion order. */
  const classNames = useMemo(() => [...new Set(scopedClasses.map((c) => c.name))].sort(byNaturalName), [scopedClasses]);

  const sectionsFor = useCallback(
    (className: string) => {
      const classIds = new Set(scopedClasses.filter((c) => c.name === className).map((c) => c.id));
      return [...new Set(sections.filter((s) => classIds.has(s.classId)).map((s) => s.name))].sort(byNaturalName);
    },
    [scopedClasses, sections],
  );

  const nextClassName = useCallback(
    (className: string) => {
      const idx = classNames.indexOf(className);
      return idx === -1 || idx === classNames.length - 1 ? null : classNames[idx + 1];
    },
    [classNames],
  );

  return {
    classNames,
    sectionsFor,
    nextClassName,
    finalClassName: classNames[classNames.length - 1] ?? "",
    isLoading: classesLoading || sectionsLoading,
  };
}
