import type { ExamStatus, ExamType, GradeBand } from "./types";

export const EXAM_TYPES = ["internal", "midterm", "final", "practical", "viva"] as const;

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  internal: "Internal",
  midterm: "Mid-term",
  final: "Final",
  practical: "Practical",
  viva: "Viva",
};

export const EXAM_STATUSES = ["scheduled", "ongoing", "completed"] as const;

export function examStatusBadgeVariant(status: ExamStatus): "success" | "info" | "neutral" {
  switch (status) {
    case "completed":
      return "success";
    case "ongoing":
      return "info";
    default:
      return "neutral";
  }
}

/**
 * Simplified, illustrative grading scale — not modeled on any real curriculum board.
 * Percentage bands (highest minimum first) map to a letter grade and a 0-10 grade point.
 * GPA for one exam = mean grade point across that exam's subjects for the student.
 * CGPA = mean GPA across all of a student's *completed* exams within the current
 * academic year. Both formulas are intentionally simple, not authoritative.
 */
export const GRADE_BANDS: GradeBand[] = [
  { grade: "A+", minPercentage: 90, gradePoint: 10 },
  { grade: "A", minPercentage: 80, gradePoint: 9 },
  { grade: "B+", minPercentage: 70, gradePoint: 8 },
  { grade: "B", minPercentage: 60, gradePoint: 7 },
  { grade: "C", minPercentage: 50, gradePoint: 6 },
  { grade: "D", minPercentage: 40, gradePoint: 5 },
  { grade: "F", minPercentage: 0, gradePoint: 0 },
];

export const ABSENT_GRADE = "AB";

export function gradeBandForPercentage(percentage: number): GradeBand {
  return GRADE_BANDS.find((band) => percentage >= band.minPercentage) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

export function computeGrade(marksObtained: number, maxMarks: number, isAbsent?: boolean): string {
  if (isAbsent) return ABSENT_GRADE;
  if (maxMarks <= 0) return GRADE_BANDS[GRADE_BANDS.length - 1].grade;
  return gradeBandForPercentage((marksObtained / maxMarks) * 100).grade;
}

export function gradePointForGrade(grade: string): number {
  return GRADE_BANDS.find((band) => band.grade === grade)?.gradePoint ?? 0;
}

export function gradeBadgeVariant(grade: string): "success" | "info" | "warning" | "danger" | "neutral" {
  if (grade === ABSENT_GRADE) return "neutral";
  switch (grade) {
    case "A+":
    case "A":
      return "success";
    case "B+":
    case "B":
      return "info";
    case "C":
      return "warning";
    case "D":
    case "F":
      return "danger";
    default:
      return "neutral";
  }
}
