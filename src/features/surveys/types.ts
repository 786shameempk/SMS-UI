import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";

export type QuestionType = "rating" | "multiple_choice" | "yes_no" | "text";
export type SurveyStatus = "draft" | "published" | "closed";
export type SurveyAudience = "students" | "parents" | "staff" | "all";
export type RespondentType = "student" | "staff" | "parent" | "anonymous";

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  audience: SurveyAudience;
  status: SurveyStatus;
  anonymousAllowed: boolean;
  opensAt: string;
  closesAt?: string;
  createdByStaffId?: string;
  createdAt: string;
  questions: SurveyQuestion[];
}

export interface SurveyFormValues {
  title: string;
  description?: string;
  audience: SurveyAudience;
  anonymousAllowed: boolean;
  opensAt: string;
  closesAt?: string;
  createdByStaffId?: string;
  questions: Array<{ text: string; type: QuestionType; options?: string[]; required: boolean }>;
}

export interface SurveyAnswer {
  questionId: string;
  /** Rating: "1".."5"; yes_no: "yes"|"no"; multiple_choice: the exact option text; text: free text. */
  value: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentType: RespondentType;
  respondentStudentId?: string;
  respondentStaffId?: string;
  respondentName?: string;
  submittedAt: string;
  answers: SurveyAnswer[];
}

export interface RecordResponseFormValues {
  surveyId: string;
  respondentType: RespondentType;
  respondentStudentId?: string;
  respondentStaffId?: string;
  respondentName?: string;
  answers: SurveyAnswer[];
}

export interface SurveyRow extends Survey {
  responseCount: number;
  createdBy?: StaffMember;
}

export interface RespondentRow extends SurveyResponse {
  respondentStudent?: Student;
  respondentStaff?: StaffMember;
  respondentLabel: string;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  type: QuestionType;
  required: boolean;
  answeredCount: number;
  ratingAverage?: number;
  ratingDistribution?: Array<{ value: number; count: number }>;
  choiceCounts?: Array<{ option: string; count: number }>;
  yesCount?: number;
  noCount?: number;
  textResponses?: string[];
}

export interface SurveyResultsSummary {
  survey: Survey;
  responseCount: number;
  questionResults: QuestionResult[];
}

export interface SurveysReportsSummary {
  totalSurveys: number;
  publishedSurveys: number;
  totalResponses: number;
  avgResponsesPerSurvey: number;
  responsesByAudience: Array<{ audience: SurveyAudience; count: number }>;
}
