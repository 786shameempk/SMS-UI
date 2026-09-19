export type Gender = "male" | "female" | "other";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
export type StudentStatus = "active" | "inactive" | "transferred" | "graduated" | "alumni";
/**
 * Full admission pipeline: Inquiry → Registration → Entrance Exam → Interview → (Selection
 * decision) → Fee Collection → Student Creation ("enrolled"). "waitlisted"/"rejected"/"withdrawn"
 * are terminal side-branches reachable from the decision step (or, for reject/withdraw, from
 * any in-progress step). There's no persisted "selection" stage — the decision made at that
 * point is what routes an application to fee_collection/waitlisted/rejected directly.
 */
export type AdmissionStage =
  | "inquiry"
  | "registration"
  | "entrance_exam"
  | "interview"
  | "fee_collection"
  | "enrolled"
  | "waitlisted"
  | "rejected"
  | "withdrawn";

export type ExamResultStatus = "scheduled" | "completed" | "absent";
export type SelectionDecision = "selected" | "waitlisted" | "rejected";
export type GuardianRelation = "father" | "mother" | "guardian";
export type DocumentCategory =
  | "birth_certificate"
  | "transfer_certificate"
  | "id_proof"
  | "photo"
  | "medical_record"
  | "other";

export interface GuardianDetails {
  id: string;
  name: string;
  relation: GuardianRelation;
  phone: string;
  email?: string;
  occupation?: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface MedicalInfo {
  bloodGroup: BloodGroup;
  allergies?: string;
  conditions?: string;
  medications?: string;
  doctorName?: string;
  doctorPhone?: string;
}

export interface TransportDetails {
  required: boolean;
  routeName?: string;
  pickupPoint?: string;
}

export interface HostelDetails {
  required: boolean;
  hostelName?: string;
  roomNumber?: string;
}

export interface StudentDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadedAt: string;
  fileDataUrl?: string;
}

export interface TransferRecord {
  transferredAt: string;
  toSchool: string;
  reason: string;
  transferCertificateNumber: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  dateOfBirth: string;
  gender: Gender;
  className: string;
  section: string;
  rollNumber?: string;
  status: StudentStatus;
  admissionDate: string;
  address: string;
  guardians: GuardianDetails[];
  emergencyContact: EmergencyContact;
  medical: MedicalInfo;
  transport: TransportDetails;
  hostel: HostelDetails;
  documents: StudentDocument[];
  transferRecord?: TransferRecord;
}

export interface StudentFormValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  className: string;
  section: string;
  rollNumber?: string;
  address: string;
  guardianName: string;
  guardianRelation: GuardianRelation;
  guardianPhone: string;
}

export interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  applicantFirstName: string;
  applicantLastName: string;
  dateOfBirth: string;
  gender: Gender;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  appliedClass: string;
  stage: AdmissionStage;
  submittedAt: string;
  notes?: string;

  // Registration
  address?: string;
  previousSchool?: string;
  registeredAt?: string;

  // Entrance exam
  examDate?: string;
  examScore?: number;
  examStatus?: ExamResultStatus;

  // Interview
  interviewDate?: string;
  interviewerName?: string;
  interviewRating?: number;
  interviewRemarks?: string;

  // Selection decision
  decision?: SelectionDecision;
  decisionRemarks?: string;
  decidedAt?: string;

  // Fee collection
  admissionFeeAmount?: number;
  admissionFeePaid?: boolean;
  admissionFeePaidOn?: string;
  admissionFeeReceiptNumber?: string;

  // Student creation
  studentId?: string;
  enrolledAt?: string;
}

export interface AdmissionFormValues {
  applicantFirstName: string;
  applicantLastName: string;
  dateOfBirth: string;
  gender: Gender;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  appliedClass: string;
  notes?: string;
}

export interface AdmissionRegistrationFormValues {
  address: string;
  previousSchool?: string;
}

export interface AdmissionExamFormValues {
  examDate: string;
  examStatus: ExamResultStatus;
  examScore?: number;
}

export interface AdmissionInterviewFormValues {
  interviewDate: string;
  interviewerName: string;
  interviewRating?: number;
  interviewRemarks?: string;
}

export interface AdmissionDecisionFormValues {
  decision: SelectionDecision;
  decisionRemarks?: string;
}

export interface AdmissionFeePaymentFormValues {
  amount: number;
  paymentMode: string;
}

export interface SeatAvailability {
  className: string;
  capacity: number;
  currentStrength: number;
  availableSeats: number;
}

export interface TransferFormValues {
  toSchool: string;
  reason: string;
  transferCertificateNumber: string;
}
