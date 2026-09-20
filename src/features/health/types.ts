import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";

export type VisitOutcome = "returned_to_class" | "sent_home" | "referred_to_hospital" | "admitted_to_infirmary";
export type VaccinationStatus = "completed" | "due" | "overdue";
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export interface HealthCheckup {
  id: string;
  studentId: string;
  checkupDate: string;
  heightCm: number;
  weightKg: number;
  visionLeft: string;
  visionRight: string;
  dentalRemarks?: string;
  generalRemarks?: string;
  examinedByStaffId?: string;
}

export interface HealthCheckupFormValues {
  studentId: string;
  checkupDate: string;
  heightCm: number;
  weightKg: number;
  visionLeft: string;
  visionRight: string;
  dentalRemarks?: string;
  generalRemarks?: string;
  examinedByStaffId?: string;
}

export interface HealthCheckupRow extends HealthCheckup {
  student: Student;
  examinedBy?: StaffMember;
  bmi: number;
  bmiCategory: BmiCategory;
}

export interface VaccinationRecord {
  id: string;
  studentId: string;
  vaccineName: string;
  doseNumber: number;
  dueDate: string;
  dateAdministered?: string;
  administeredByStaffId?: string;
  notes?: string;
}

export interface VaccinationFormValues {
  studentId: string;
  vaccineName: string;
  doseNumber: number;
  dueDate: string;
  notes?: string;
}

export interface MarkVaccinationAdministeredFormValues {
  dateAdministered: string;
  administeredByStaffId?: string;
}

export interface VaccinationRow extends VaccinationRecord {
  student: Student;
  administeredBy?: StaffMember;
  status: VaccinationStatus;
}

export interface InfirmaryVisit {
  id: string;
  studentId: string;
  visitedAt: string;
  symptoms: string;
  temperatureC?: number;
  treatmentGiven: string;
  medicineGiven?: string;
  outcome: VisitOutcome;
  parentNotified: boolean;
  attendedByStaffId?: string;
}

export interface InfirmaryVisitFormValues {
  studentId: string;
  visitedAt: string;
  symptoms: string;
  temperatureC?: number;
  treatmentGiven: string;
  medicineGiven?: string;
  outcome: VisitOutcome;
  parentNotified: boolean;
  attendedByStaffId?: string;
}

export interface InfirmaryVisitRow extends InfirmaryVisit {
  student: Student;
  attendedBy?: StaffMember;
}

export interface HealthRecordRow {
  student: Student;
  lastCheckupDate?: string;
  overdueVaccinations: number;
  visitCountThisYear: number;
}

export interface HealthReportsSummary {
  totalActiveStudents: number;
  studentsWithAllergies: number;
  studentsWithConditions: number;
  overdueVaccinations: VaccinationRow[];
  upcomingVaccinations: VaccinationRow[];
  visitsLast30Days: number;
  visitsByOutcome: Array<{ outcome: VisitOutcome; count: number }>;
  bmiDistribution: Array<{ category: BmiCategory; count: number }>;
}
