import type {
  AchievementStatus,
  ActivityKind,
  ActivitySetting,
  ActivityStatus,
  EnrollmentStatus,
  EventStatus,
  GroupKind,
  ParticipantType,
  Recurrence,
  SessionAttendanceStatus,
  ShuffleScope,
  ShuffleStrategy,
  TeamRole,
} from "./types";

export const KIND_LABEL: Record<ActivityKind, string> = { Individual: "Individual", Team: "Team" };
export const SETTING_LABEL: Record<ActivitySetting, string> = { Indoor: "Indoor", Outdoor: "Outdoor", Both: "Indoor and outdoor" };
export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = { Draft: "Draft", Active: "Active", Inactive: "Inactive", Completed: "Completed" };
export const GROUP_KIND_LABEL: Record<GroupKind, string> = { House: "House", Team: "Team", Club: "Club", Activity: "Activity group", Mixed: "Mixed group" };
export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  Requested: "Requested",
  Approved: "Approved",
  Waitlisted: "Waiting list",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
  Completed: "Completed",
};
export const TEAM_ROLE_LABEL: Record<TeamRole, string> = { Member: "Member", Captain: "Captain", ViceCaptain: "Vice-captain" };
export const ATTENDANCE_LABEL: Record<SessionAttendanceStatus, string> = { Present: "Present", Absent: "Absent", Late: "Late", Excused: "Excused" };
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = { Draft: "Draft", Open: "Registration open", InProgress: "In progress", Completed: "Completed", Cancelled: "Cancelled" };
export const PARTICIPANT_LABEL: Record<ParticipantType, string> = { Student: "Student", Team: "Team", Group: "Group" };
export const ACHIEVEMENT_STATUS_LABEL: Record<AchievementStatus, string> = { Pending: "Awaiting approval", Published: "Published", Rejected: "Rejected" };
export const RECURRENCE_LABEL: Record<Recurrence, string> = { None: "Does not repeat", Daily: "Every day", Weekly: "Every week", Monthly: "Every month" };

export const STRATEGY_LABEL: Record<ShuffleStrategy, string> = {
  Equal: "Equal numbers (random order)",
  Random: "Pure random",
  ByClass: "Balanced by class",
  ByGrade: "Balanced by grade",
  ByGender: "Balanced by gender",
};
export const STRATEGY_HELP: Record<ShuffleStrategy, string> = {
  Equal: "Group sizes differ by at most one student.",
  Random: "Every student gets a random group. Sizes can differ.",
  ByClass: "Each class is spread evenly across the groups.",
  ByGrade: "Each grade is spread evenly across the groups.",
  ByGender: "Each gender is spread evenly across the groups.",
};
export const SCOPE_LABEL: Record<ShuffleScope, string> = { UnassignedOnly: "Only students not in a group yet", Everyone: "Everyone (locked groups stay as they are)" };

export const LEVELS = ["School", "Inter-house", "Inter-school", "District", "State", "National", "International"];
