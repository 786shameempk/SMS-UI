// Mirrors MeetingService's DTOs (MeetingService.Application/DTO). Enum values are MeetingService's own
// PascalCase names - this module is new, so there is no older lowercase mock vocabulary to translate from.

export type MeetingType =
  | "OnlineClass"
  | "ParentTeacherMeeting"
  | "TeacherMeeting"
  | "StaffMeeting"
  | "PrincipalMeeting"
  | "ManagementMeeting"
  | "TrainingSession"
  | "Examination"
  | "Other";

export type MeetingStatus = "Draft" | "Scheduled" | "Live" | "Completed" | "Cancelled";

export type ProviderKind = "LiveKit" | "ExternalLink";

export type AudienceType =
  | "Section"
  | "Class"
  | "SectionGuardians"
  | "ClassGuardians"
  | "Student"
  | "StudentGuardians"
  | "Staff"
  | "AllStaff"
  | "AllTeachers"
  | "Management";

export type AttendanceStatus = "Present" | "Late" | "Partial" | "Absent";

export type ParticipantRole = "Host" | "CoHost" | "Attendee";

export type ParticipantPersonType = "Student" | "Parent" | "Teacher" | "Staff" | "Management";

export type SeriesScope = "This" | "Following" | "All";

export type MeetingRelation = "None" | "ChildViewer" | "Participant" | "CoHost" | "Host" | "Manager";

export type Weekday = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export type RecordingVisibility = "Staff" | "Students" | "StudentsAndParents";

export type MaterialKind = "File" | "Link" | "Assignment";

export interface AudienceRule {
  type: AudienceType;
  targetId?: string | null;
}

export interface Audience extends AudienceRule {
  label: string | null;
}

export interface MeetingSummary {
  id: string;
  title: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  isRescheduled: boolean;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  opensAtUtc: string;
  hostUserId: string;
  hostName: string;
  subjectName: string | null;
  classLabel: string | null;
  sectionId: string | null;
  participantCount: number;
  canJoinNow: boolean;
  isSeries: boolean;
  recurrenceId: string | null;
  provider: ProviderKind;
  myRelation: MeetingRelation;
}

export interface MeetingCapabilities {
  edit: boolean;
  cancel: boolean;
  reschedule: boolean;
  start: boolean;
  end: boolean;
  join: boolean;
  viewAttendance: boolean;
  editAttendance: boolean;
  manageParticipants: boolean;
  manageMaterials: boolean;
  editNotes: boolean;
  viewNotes: boolean;
  manageRecordings: boolean;
  delete: boolean;
  chat: boolean;
  moderateChat: boolean;
}

export interface RecurrenceSummary {
  id: string;
  frequency: "Daily" | "Weekly";
  interval: number;
  daysOfWeek: Weekday[];
  startDate: string;
  endDate: string | null;
  count: number | null;
  localStartTime: string;
  durationMinutes: number;
  timeZoneId: string;
  isEnded: boolean;
  description: string;
}

export interface MeetingDetail {
  summary: MeetingSummary;
  description: string | null;
  subjectId: string | null;
  classId: string | null;
  branchId: string | null;
  audiences: Audience[];
  can: MeetingCapabilities;
  materialCount: number;
  recordingCount: number;
  hasNotes: boolean;
  recordingEnabled: boolean;
  chatEnabled: boolean;
  actualStartUtc: string | null;
  actualEndUtc: string | null;
  rescheduledFromUtc: string | null;
  rescheduleCount: number;
  cancelReason: string | null;
  reminderOffsetsMinutes: number[];
  recurrence: RecurrenceSummary | null;
  hasExternalLink: boolean;
}

export interface Participant {
  userId: string;
  displayName: string;
  detail: string | null;
  role: ParticipantRole;
  personType: ParticipantPersonType;
  source: "Direct" | "Audience";
  invitedAt: string;
}

export interface CreateMeetingResult {
  firstSession: MeetingSummary;
  recurrenceId: string | null;
  sessionsPlanned: number;
  sessionsGenerated: number;
  unlinkedCount: number;
}

export interface JoinTicket {
  mode: "Embedded" | "External";
  serverUrl: string | null;
  token: string | null;
  externalUrl: string | null;
  expiresUtc: string;
  meetingId: string;
  title: string;
  isHost: boolean;
  canChat: boolean;
}

export interface AttendanceRow {
  userId: string;
  name: string;
  detail: string | null;
  personType: ParticipantPersonType;
  role: ParticipantRole;
  firstJoinUtc: string | null;
  lastLeaveUtc: string | null;
  durationMinutes: number;
  status: AttendanceStatus;
  computedStatus: AttendanceStatus;
  isOverridden: boolean;
  overrideReason: string | null;
  inRoomNow: boolean;
}

export interface AttendanceSheet {
  isFinalized: boolean;
  present: number;
  late: number;
  partial: number;
  absent: number;
  lateAfterMinutes: number;
  presentMinPercent: number;
  rows: AttendanceRow[];
}

export interface Material {
  id: string;
  kind: MaterialKind;
  title: string;
  fileName: string | null;
  url: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  dueDate: string | null;
  createdAt: string;
  downloadUrl: string | null;
}

export interface Recording {
  id: string;
  recordedAt: string;
  durationSeconds: number;
  sizeBytes: number;
  isReady: boolean;
  visibility: RecordingVisibility;
  canDelete: boolean;
}

export interface MeetingNotes {
  summary: string | null;
  topicsDiscussed: string | null;
  actionItems: string | null;
  homework: string | null;
  additionalNotes: string | null;
  isVisibleToStudents: boolean;
  updatedAt: string | null;
}

export interface ChatMessage {
  id: string;
  senderUserId: string;
  senderName: string;
  body: string;
  kind: "Message" | "Announcement";
  isPinned: boolean;
  sentAt: string;
  isMine: boolean;
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  timestamp: string;
  userId: string | null;
  actorName: string | null;
  ipAddress: string | null;
  additionalData: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  isRescheduled: boolean;
  startUtc: string;
  endUtc: string;
  classLabel: string | null;
  hostName: string;
}

export interface MeetingSettings {
  defaultProvider: ProviderKind;
  defaultReminderOffsetsMinutes: number[];
  lateAfterMinutes: number;
  presentMinPercent: number;
  parentsCanViewRecordings: boolean;
  studentsCanChat: boolean;
  recordingRetentionDays: number;
  timeZoneId: string;
  recordingAvailable: boolean;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface SeriesDetail {
  rule: RecurrenceSummary;
  title: string;
  meetingType: MeetingType;
  classLabel: string | null;
  hostName: string;
  sessionsPlanned: number;
  sessionsGenerated: number;
  sessionsCompleted: number;
  sessionsCancelled: number;
  upcoming: MeetingSummary[];
}

export interface MeetingReport {
  total: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  live: number;
  totalMinutesHeld: number;
  averageAttendancePercent: number;
  byType: Array<{ type: MeetingType; count: number }>;
  byDay: Array<{ date: string; completed: number; cancelled: number }>;
}

export interface StudentAttendanceRow {
  userId: string;
  name: string;
  detail: string | null;
  totalClasses: number;
  present: number;
  late: number;
  partial: number;
  absent: number;
  attendancePercent: number;
}

export interface TeacherReportRow {
  hostUserId: string;
  teacher: string;
  classesConducted: number;
  classesCancelled: number;
  totalStudents: number;
  averageAttendancePercent: number;
  minutesTaught: number;
}

/** A person from AcademicService's directory who has a login, i.e. someone who can be invited. */
export interface DirectoryPerson {
  userId: string;
  personId: string;
  personType: "Student" | "Guardian" | "Staff";
  displayName: string;
  detail: string | null;
  sectionId: string | null;
  classId: string | null;
  studentId: string | null;
  staffDesignation: string | null;
}

export interface ScheduleMeetingInput {
  title: string;
  description?: string;
  meetingType: MeetingType;
  subjectId?: string | null;
  sectionId?: string | null;
  hostUserId?: string | null;
  startUtc: string;
  durationMinutes: number;
  audience: AudienceRule[];
  recurrence?: {
    frequency: "Daily" | "Weekly";
    interval: number;
    daysOfWeek: Weekday[];
    startDate: string;
    endDate?: string | null;
    count?: number | null;
    localStartTime: string;
    timeZoneId: string;
  } | null;
  reminderOffsetsMinutes: number[];
  provider: ProviderKind;
  externalJoinUrl?: string | null;
  recordingEnabled: boolean;
  chatEnabled: boolean;
  saveAsDraft: boolean;
  schoolWide: boolean;
  hostDisplayName?: string;
}
