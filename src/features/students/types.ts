export type Gender = "male" | "female" | "other";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
export type StudentStatus = "active" | "inactive" | "transferred" | "graduated" | "alumni";
export type AdmissionStatus = "pending" | "approved" | "rejected" | "waitlisted";
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
  applicantFirstName: string;
  applicantLastName: string;
  dateOfBirth: string;
  gender: Gender;
  guardianName: string;
  guardianPhone: string;
  appliedClass: string;
  status: AdmissionStatus;
  submittedAt: string;
  notes?: string;
}

export interface AdmissionFormValues {
  applicantFirstName: string;
  applicantLastName: string;
  dateOfBirth: string;
  gender: Gender;
  guardianName: string;
  guardianPhone: string;
  appliedClass: string;
  notes?: string;
}

export interface TransferFormValues {
  toSchool: string;
  reason: string;
  transferCertificateNumber: string;
}
