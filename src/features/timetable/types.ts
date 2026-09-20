export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5;

export interface PeriodDefinition {
  periodNumber: number;
  label: string;
  time: string;
  isBreak?: boolean;
}

export interface Room {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  capacity: number;
}

export interface RoomFormValues {
  name: string;
  capacity: number;
}

export interface TimetableSlot {
  id: string;
  tenantId: string;
  branchId: string;
  sectionId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  subjectId?: string;
  staffId?: string;
  room?: string;
  isBreak?: boolean;
}

export interface SlotAssignmentValues {
  sectionId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  subjectId?: string;
  staffId?: string;
  room?: string;
}

export interface TimetableSubstitution {
  id: string;
  tenantId: string;
  branchId: string;
  date: string;
  sectionId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  originalStaffId?: string;
  substituteStaffId: string;
  reason?: string;
}

export interface SubstitutionFormValues {
  date: string;
  sectionId: string;
  periodNumber: number;
  substituteStaffId: string;
  reason?: string;
}
