import type { Student } from "./types";

/** "Grade 8 - A". Some schools name sections "Grade 1 - A" rather than "A"; don't repeat the class name then. */
export function classLabel(s: Pick<Student, "className" | "section">) {
  return s.section?.startsWith(s.className) ? s.section : [s.className, s.section].filter(Boolean).join(" - ");
}
