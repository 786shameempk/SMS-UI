export type StaffDesignation =
  | "Teacher"
  | "Principal"
  | "Vice Principal"
  | "Accountant"
  | "Receptionist"
  | "Librarian"
  | "Driver"
  | "Warden"
  | "Cleaner"
  | "Security"
  | "HR"
  | "IT Support";

export type StaffStatus = "active" | "on-leave" | "resigned" | "terminated";
export type Gender = "male" | "female" | "other";

export interface Qualification {
  id: string;
  degree: string;
  institution: string;
  yearCompleted: number;
}

export interface Experience {
  id: string;
  organization: string;
  role: string;
  fromYear: number;
  toYear?: number;
  description?: string;
}

export interface SalaryDetails {
  basic: number;
  allowances: number;
  deductions: number;
  bankName?: string;
  bankAccountNumber?: string;
  effectiveFrom: string;
}

export interface SalaryPayment {
  id: string;
  month: string;
  amountPaid: number;
  paidOn: string;
}

export interface StaffDocument {
  id: string;
  name: string;
  category: "id_proof" | "resume" | "certificate" | "contract" | "other";
  uploadedAt: string;
  fileDataUrl?: string;
}

export interface PerformanceReview {
  id: string;
  reviewDate: string;
  reviewerName: string;
  rating: number;
  comments: string;
}

export interface PromotionRecord {
  id: string;
  fromDesignation: string;
  toDesignation: string;
  effectiveDate: string;
  remarks?: string;
}

export interface ResignationRecord {
  resignedAt: string;
  lastWorkingDate: string;
  reason: string;
}

export interface AttendanceDay {
  date: string;
  status: "present" | "absent" | "late" | "holiday";
}

export interface StaffAttendanceSummary {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalDays: number;
  recent: AttendanceDay[];
}

export interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  designation: StaffDesignation;
  department: string;
  status: StaffStatus;
  joiningDate: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string;
  address: string;
  qualifications: Qualification[];
  experience: Experience[];
  salary: SalaryDetails;
  salaryHistory: SalaryPayment[];
  documents: StaffDocument[];
  performanceReviews: PerformanceReview[];
  promotions: PromotionRecord[];
  resignation?: ResignationRecord;
}

export interface StaffFormValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  designation: StaffDesignation;
  department: string;
  phone: string;
  email: string;
  address: string;
}

export interface PromoteStaffFormValues {
  toDesignation: StaffDesignation;
  effectiveDate: string;
  remarks?: string;
}

export interface ResignStaffFormValues {
  lastWorkingDate: string;
  reason: string;
}

export interface QualificationFormValues {
  degree: string;
  institution: string;
  yearCompleted: number;
}

export interface ExperienceFormValues {
  organization: string;
  role: string;
  fromYear: number;
  toYear?: number;
  description?: string;
}

export interface PerformanceReviewFormValues {
  reviewerName: string;
  rating: number;
  comments: string;
}

export type LeaveType = "sick" | "casual" | "earned" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface StaffLeaveRequest {
  id: string;
  staffId: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  requestedAt: string;
}

export interface LeaveRequestFormValues {
  staffId: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
}
