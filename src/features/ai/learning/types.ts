export interface ProfileObservation {
  kind: "positive" | "attention";
  area: "attendance" | "results" | "homework";
  text: string;
}

/** Computed by the school system from the student's own records. */
export interface ObservedLearningProfile {
  studentId: string;
  firstName: string;
  attendanceWindowDays: number;
  attendancePercent: number | null;
  attendanceDaysMarked: number;
  recentAttendancePercent: number | null;
  exams: { exam: string; percentage: number; grade: string | null }[];
  cgpa: number | null;
  resultsChange: number | null;
  homeworkAssigned: number;
  homeworkSubmitted: number;
  homeworkOverdue: number;
  homeworkBySubject: { subject: string; assigned: number; submitted: number; overdue: number }[];
  observations: ProfileObservation[];
  generatedAt: string;
}

/** The AI's reading of the observed profile. */
export interface LearningProfileInterpretation {
  observed: ObservedLearningProfile;
  summary: string;
  strengths: string[];
  focusAreas: { area: string; evidence: string; suggestion: string }[];
  studyTips: string[];
}
