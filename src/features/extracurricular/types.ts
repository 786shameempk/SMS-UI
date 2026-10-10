// Types for CampusService's /api/extracurricular endpoints. Enums are the API's own PascalCase strings (as the server sends and
// accepts them); dates are "YYYY-MM-DD" and times "HH:mm:ss".

export type ActivityKind = "Individual" | "Team";
export type ActivitySetting = "Indoor" | "Outdoor" | "Both";
export type ActivityStatus = "Draft" | "Active" | "Inactive" | "Completed";
export type GroupKind = "House" | "Team" | "Club" | "Activity" | "Mixed";
export type AssignmentMethod = "Manual" | "Auto" | "Override";
export type EnrollmentStatus = "Requested" | "Approved" | "Waitlisted" | "Rejected" | "Withdrawn" | "Completed";
export type EnrollmentSource = "Admin" | "Teacher" | "Student" | "Parent";
export type TeamRole = "Member" | "Captain" | "ViceCaptain";
export type SessionStatus = "Scheduled" | "Cancelled" | "Completed";
export type SessionAttendanceStatus = "Present" | "Absent" | "Late" | "Excused";
export type EventStatus = "Draft" | "Open" | "InProgress" | "Completed" | "Cancelled";
export type ParticipantType = "Student" | "Team" | "Group";
export type AchievementStatus = "Pending" | "Published" | "Rejected";
export type MeasurementKind = "Measured" | "Estimated";
export type ShuffleStrategy = "Random" | "Equal" | "ByClass" | "ByGrade" | "ByGender";
export type ShuffleScope = "UnassignedOnly" | "Everyone";
export type Recurrence = "None" | "Daily" | "Weekly" | "Monthly";
export type SessionAction = "Cancel" | "Complete" | "Reinstate";

export interface Page<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  isSustainability: boolean;
  activityCount: number;
}

export interface Settings {
  maxActivitiesPerStudent: number;
  allowSelfEnrollment: boolean;
  preventScheduleConflicts: boolean;
  singleGroupPerKind: boolean;
}

export interface Activity {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  categoryName?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  academicYear: string;
  kind: ActivityKind;
  setting: ActivitySetting;
  status: ActivityStatus;
  eligibility?: string | null;
  minGrade?: number | null;
  maxGrade?: number | null;
  coordinatorStaffId?: string | null;
  coordinatorName?: string | null;
  capacity?: number | null;
  minParticipants: number;
  location?: string | null;
  scheduleNote?: string | null;
  equipment?: string | null;
  safetyNotes?: string | null;
  enrollmentStart?: string | null;
  enrollmentEnd?: string | null;
  requiresApproval: boolean;
  requiresConsent: boolean;
  enrolled: number;
  waitlisted: number;
  pending: number;
  enrollmentOpen: boolean;
}

export type ActivityInput = Omit<Activity, "id" | "categoryName" | "enrolled" | "waitlisted" | "pending" | "enrollmentOpen">;

export interface Group {
  id: string;
  name: string;
  code: string;
  color: string;
  kind: GroupKind;
  academicYear: string;
  sortOrder: number;
  locked: boolean;
  memberCount: number;
}

export interface GroupMember {
  assignmentId: string;
  studentId: string;
  studentName: string;
  className?: string | null;
  gender?: string | null;
  method: AssignmentMethod;
}

export interface UnassignedStudent {
  id: string;
  name: string;
  className?: string | null;
  gender?: string | null;
}

export interface ShuffleMove {
  studentId: string;
  studentName: string;
  className?: string | null;
  fromGroupId?: string | null;
  fromGroupName?: string | null;
  toGroupId: string;
  toGroupName: string;
}

export interface ShufflePreview {
  seed: number;
  moves: ShuffleMove[];
  totals: { groupId: string; groupName: string; before: number; after: number }[];
  lockedMembersKept: number;
  unchanged: number;
}

export interface GroupHistory {
  id: string;
  studentId: string;
  studentName: string;
  fromGroupName?: string | null;
  toGroupName?: string | null;
  reason: string;
  batchId?: string | null;
  at: string;
  by?: string | null;
}

export interface Enrollment {
  id: string;
  activityId: string;
  activityName: string;
  studentId: string;
  studentName: string;
  className?: string | null;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  consentGiven: boolean;
  note?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
}

export interface Team {
  id: string;
  activityId: string;
  activityName: string;
  name: string;
  code: string;
  color: string;
  level?: string | null;
  coachName?: string | null;
  maxMembers?: number | null;
  description?: string | null;
  isActive: boolean;
  memberCount: number;
  substituteCount: number;
  captain?: string | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  studentId: string;
  studentName: string;
  className?: string | null;
  role: TeamRole;
  isSubstitute: boolean;
  position?: string | null;
  jerseyNumber?: number | null;
  joinedOn: string;
  leftOn?: string | null;
}

export interface Session {
  id: string;
  activityId: string;
  activityName: string;
  teamId?: string | null;
  teamName?: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string | null;
  instructorName?: string | null;
  instructorStaffId?: string | null;
  status: SessionStatus;
  cancelReason?: string | null;
  seriesId?: string | null;
  marked: number;
  expected: number;
}

export interface SessionInput {
  activityId: string;
  teamId?: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string | null;
  instructorName?: string | null;
  instructorStaffId?: string | null;
  recurrence: Recurrence;
  repeatUntil?: string | null;
  repeatCount?: number | null;
}

export interface AttendanceRow {
  studentId: string;
  studentName: string;
  status?: SessionAttendanceStatus | null;
  note?: string | null;
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  sessions: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  percentage: number;
  hours: number;
}

export interface ActivityEvent {
  id: string;
  name: string;
  eventType: string;
  activityId?: string | null;
  startDate: string;
  endDate: string;
  venue?: string | null;
  organizer?: string | null;
  registrationDeadline?: string | null;
  level?: string | null;
  description?: string | null;
  status: EventStatus;
  registrations: number;
  registrationOpen: boolean;
}

export type EventInput = Omit<ActivityEvent, "id" | "registrations" | "registrationOpen">;

export interface Registration {
  id: string;
  eventId: string;
  participantType: ParticipantType;
  participantId: string;
  participantName: string;
}

export interface EventResult {
  id?: string | null;
  eventId?: string;
  participantType: ParticipantType;
  participantId?: string | null;
  participantName: string;
  round?: string | null;
  score?: number | null;
  rank?: number | null;
  award?: string | null;
  notes?: string | null;
}

export interface Achievement {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  awardType?: string | null;
  level?: string | null;
  date: string;
  activityId?: string | null;
  eventId?: string | null;
  description?: string | null;
  evidenceUrl?: string | null;
  academicYear: string;
  status: AchievementStatus;
}

export type AchievementInput = Omit<Achievement, "id" | "studentName" | "status">;

export interface Campaign {
  id: string;
  name: string;
  programType: string;
  description?: string | null;
  metricName: string;
  unit: string;
  target: number;
  baseline: number;
  startDate: string;
  endDate?: string | null;
  coordinatorName?: string | null;
  location?: string | null;
  status: ActivityStatus;
  verifiedTotal: number;
  measuredTotal: number;
  estimatedTotal: number;
  progressPercent: number;
  participants: number;
  volunteerHours: number;
  entries: number;
}

export type CampaignInput = Omit<Campaign, "id" | "verifiedTotal" | "measuredTotal" | "estimatedTotal" | "progressPercent" | "participants" | "volunteerHours" | "entries">;

export interface Measurement {
  id: string;
  campaignId: string;
  date: string;
  value: number;
  kind: MeasurementKind;
  method?: string | null;
  evidence?: string | null;
  participants: number;
  volunteerHours: number;
  verified: boolean;
  verifiedBy?: string | null;
}

export interface MeasurementInput {
  id?: string | null;
  date: string;
  value: number;
  kind: MeasurementKind;
  method?: string | null;
  evidence?: string | null;
  participants: number;
  volunteerHours: number;
}

export interface Dashboard {
  activities: number;
  activeActivities: number;
  groups: number;
  teams: number;
  students: number;
  participatingStudents: number;
  participationRate: number;
  pendingEnrollments: number;
  pendingAchievements: number;
  upcomingSessions: number;
  upcomingEvents: number;
  activitiesWithSpace: number;
  byCategory: { category: string; color: string; activities: number; participants: number }[];
  topActivities: Activity[];
  nextSessions: Session[];
  nextEvents: ActivityEvent[];
  campaigns: Campaign[];
}

export interface MyOverview {
  enrollments: Enrollment[];
  groups: { studentId: string; studentName: string; groupName: string; color: string; kind: GroupKind; academicYear: string }[];
  teams: { studentId: string; studentName: string; teamName: string; activityName: string; role: TeamRole; isSubstitute: boolean; jerseyNumber?: number | null }[];
  achievements: number;
}

export interface NonParticipant {
  id: string;
  name: string;
  className?: string | null;
}
