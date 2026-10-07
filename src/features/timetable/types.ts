export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5;

export interface PeriodDefinition {
  periodNumber: number;
  label: string;
  /** Display text, e.g. "8:00 - 8:40". */
  time: string;
  /** 24-hour "HH:mm". Always present for a branch's own periods. */
  startTime?: string;
  endTime?: string;
  isBreak?: boolean;
}

/** A branch's bell schedule: its periods (in time order) and which weekdays are school days. */
export interface TimetableSetup {
  periods: PeriodDefinition[];
  workingDays: DayOfWeek[];
  /** False while the branch still uses the built-in schedule. */
  isCustom: boolean;
}

/** One editable row in the period setup form. */
export interface PeriodFormRow {
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface TimetableSetupFormValues {
  periods: PeriodFormRow[];
  workingDays: DayOfWeek[];
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
