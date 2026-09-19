import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";

export type HostelType = "boys" | "girls" | "co-ed";
export type HostelStatus = "active" | "inactive";

export interface Hostel {
  id: string;
  name: string;
  type: HostelType;
  wardenStaffId?: string;
  address?: string;
  status: HostelStatus;
}

export interface HostelFormValues {
  name: string;
  type: HostelType;
  wardenStaffId?: string;
  address?: string;
  status: HostelStatus;
}

export interface HostelRow extends Hostel {
  warden?: StaffMember;
  roomCount: number;
  bedCount: number;
  occupiedCount: number;
}

export type RoomType = "single" | "double" | "triple" | "dormitory";
export type RoomStatus = "active" | "maintenance";

export interface Room {
  id: string;
  hostelId: string;
  roomNumber: string;
  floor: string;
  capacity: number;
  roomType: RoomType;
  status: RoomStatus;
}

export interface RoomFormValues {
  roomNumber: string;
  floor: string;
  capacity: number;
  roomType: RoomType;
  status: RoomStatus;
}

export interface RoomRow extends Room {
  occupiedBeds: number;
}

export type AllocationStatus = "active" | "vacated";

export interface HostelAllocation {
  id: string;
  studentId: string;
  hostelId: string;
  roomId: string;
  bedNumber: number;
  monthlyFee?: number;
  allocatedOn: string;
  vacatedOn?: string;
  status: AllocationStatus;
}

export interface AllocateStudentFormValues {
  studentId: string;
  hostelId: string;
  roomId: string;
  monthlyFee?: number;
}

export interface HostelAllocationRow extends HostelAllocation {
  student: Student;
  hostel: Hostel;
  room: Room;
}

export type VisitorStatus = "checked-in" | "checked-out";

export interface VisitorLog {
  id: string;
  hostelId: string;
  studentId: string;
  visitorName: string;
  relation: string;
  phone: string;
  purpose?: string;
  checkInAt: string;
  checkOutAt?: string;
  status: VisitorStatus;
}

export interface VisitorCheckInFormValues {
  hostelId: string;
  studentId: string;
  visitorName: string;
  relation: string;
  phone: string;
  purpose?: string;
}

export interface VisitorLogRow extends VisitorLog {
  student: Student;
  hostel: Hostel;
}

export type HostelAttendanceStatus = "present" | "absent" | "on-leave";

export interface HostelAttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: HostelAttendanceStatus;
}

export interface MarkHostelAttendanceEntry {
  studentId: string;
  status: HostelAttendanceStatus;
}

export type HostelFeePaymentStatus = "pending" | "paid";

export interface HostelFeePayment {
  id: string;
  allocationId: string;
  month: string;
  amount: number;
  status: HostelFeePaymentStatus;
  paidOn?: string;
}

export interface HostelFeePaymentRow extends HostelFeePayment {
  allocation: HostelAllocation;
  student: Student;
  hostel: Hostel;
}

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type MealType = "breakfast" | "lunch" | "snacks" | "dinner";

export interface MessMenuEntry {
  id: string;
  hostelId: string;
  day: DayOfWeek;
  meal: MealType;
  items: string;
}

export interface MessMenuEntryFormValues {
  items: string;
}
