import { academicHttpClient, extractApiErrorMessage, MEETING_API_BASE_URL, meetingHttpClient } from "@/lib/httpClient";
import type {
  ActivityEntry,
  AttendanceSheet,
  AttendanceStatus,
  AudienceRule,
  CalendarEvent,
  ChatMessage,
  CreateMeetingResult,
  DirectoryPerson,
  JoinTicket,
  Material,
  MaterialKind,
  MeetingDetail,
  MeetingNotes,
  MeetingReport,
  MeetingSettings,
  MeetingStatus,
  MeetingSummary,
  MeetingType,
  PagedResult,
  Participant,
  Recording,
  RecordingVisibility,
  ScheduleMeetingInput,
  SeriesDetail,
  SeriesScope,
  StudentAttendanceRow,
  TeacherReportRow,
} from "./types";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

/** Signed download links come back relative ("api/meeting-files/..."); they need the service's origin. */
export function absoluteFileUrl(relative: string): string {
  return new URL(relative, MEETING_API_BASE_URL).toString();
}

const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// ── Lists ───────────────────────────────────────────────────────────────────

export interface MeetingListFilters {
  from?: string;
  to?: string;
  type?: MeetingType;
  status?: MeetingStatus;
  sectionId?: string;
  search?: string;
  mine?: boolean;
  descending?: boolean;
  page?: number;
  pageSize?: number;
}

export const listMeetings = (filters: MeetingListFilters = {}) =>
  unwrap(meetingHttpClient.get<PagedResult<MeetingSummary>>("api/meetings", { params: filters }));

export const listTodayMeetings = () =>
  unwrap(meetingHttpClient.get<MeetingSummary[]>("api/meetings/today", { params: { timeZone: browserTimeZone() } }));

export const listUpcomingMeetings = (days = 14, take = 20) =>
  unwrap(meetingHttpClient.get<MeetingSummary[]>("api/meetings/upcoming", { params: { days, take } }));

export const listCalendarEvents = (from: string, to: string, type?: MeetingType) =>
  unwrap(meetingHttpClient.get<CalendarEvent[]>("api/meetings/calendar", { params: { from, to, type } }));

// ── One meeting ─────────────────────────────────────────────────────────────

export const getMeeting = (id: string) => unwrap(meetingHttpClient.get<MeetingDetail>(`api/meetings/${id}`));

export const scheduleMeeting = (input: ScheduleMeetingInput) =>
  unwrap(meetingHttpClient.post<CreateMeetingResult>("api/meetings", input));

export interface UpdateMeetingInput {
  title: string;
  description?: string | null;
  subjectId?: string | null;
  recordingEnabled: boolean;
  chatEnabled: boolean;
  reminderOffsetsMinutes?: number[] | null;
  externalJoinUrl?: string | null;
}

export const updateMeeting = (id: string, input: UpdateMeetingInput, scope: SeriesScope = "This") =>
  unwrap(meetingHttpClient.put<MeetingDetail>(`api/meetings/${id}`, input, { params: { scope } }));

export const deleteMeeting = (id: string) => unwrap(meetingHttpClient.delete(`api/meetings/${id}`));

export const publishMeeting = (id: string) => unwrap(meetingHttpClient.post<MeetingDetail>(`api/meetings/${id}/publish`));

export const cancelMeeting = (id: string, reason: string, scope: SeriesScope = "This") =>
  unwrap(meetingHttpClient.post<MeetingDetail>(`api/meetings/${id}/cancel`, { reason }, { params: { scope } }));

export const rescheduleMeeting = (id: string, startUtc: string, durationMinutes: number, scope: SeriesScope = "This") =>
  unwrap(meetingHttpClient.post<MeetingDetail>(`api/meetings/${id}/reschedule`, { startUtc, durationMinutes }, { params: { scope } }));

export const startMeeting = (id: string) => unwrap(meetingHttpClient.post<MeetingDetail>(`api/meetings/${id}/start`));

export const endMeeting = (id: string) => unwrap(meetingHttpClient.post<MeetingDetail>(`api/meetings/${id}/end`));

export const joinMeeting = (id: string) => unwrap(meetingHttpClient.post<JoinTicket>(`api/meetings/${id}/join`));

export const getActivity = (id: string) => unwrap(meetingHttpClient.get<ActivityEntry[]>(`api/meetings/${id}/activity`));

// ── Participants & attendance ───────────────────────────────────────────────

export const listParticipants = (id: string) => unwrap(meetingHttpClient.get<Participant[]>(`api/meetings/${id}/participants`));

export const addParticipants = (id: string, audience: AudienceRule[], scope: SeriesScope = "This") =>
  unwrap(meetingHttpClient.post<{ added: number; alreadyInvited: number; unlinkedCount: number }>(
    `api/meetings/${id}/participants`, { audience }, { params: { scope } }));

export const removeParticipant = (id: string, userId: string, scope: SeriesScope = "This") =>
  unwrap(meetingHttpClient.delete(`api/meetings/${id}/participants/${userId}`, { params: { scope } }));

export const getAttendance = (id: string) => unwrap(meetingHttpClient.get<AttendanceSheet>(`api/meetings/${id}/attendance`));

export const overrideAttendance = (id: string, userId: string, status: AttendanceStatus, reason: string) =>
  unwrap(meetingHttpClient.put<AttendanceSheet>(`api/meetings/${id}/attendance/${userId}`, { status, reason }));

// ── Notes, materials, recordings ────────────────────────────────────────────

export async function getNotes(id: string): Promise<MeetingNotes | null> {
  const data = await unwrap(meetingHttpClient.get<MeetingNotes | "">(`api/meetings/${id}/notes`));
  return data || null;
}

export const saveNotes = (id: string, notes: Omit<MeetingNotes, "updatedAt">) =>
  unwrap(meetingHttpClient.put<MeetingNotes>(`api/meetings/${id}/notes`, notes));

export const listMaterials = (id: string) => unwrap(meetingHttpClient.get<Material[]>(`api/meetings/${id}/materials`));

export function uploadMaterial(id: string, file: File, title?: string) {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  return unwrap(meetingHttpClient.post<Material>(`api/meetings/${id}/materials`, form, { headers: { "Content-Type": "multipart/form-data" } }));
}

export const addMaterialLink = (id: string, input: { kind: MaterialKind; title: string; url?: string; dueDate?: string | null }) =>
  unwrap(meetingHttpClient.post<Material>(`api/meetings/${id}/materials/link`, input));

export const deleteMaterial = (id: string, materialId: string) =>
  unwrap(meetingHttpClient.delete(`api/meetings/${id}/materials/${materialId}`));

export const listRecordings = (id: string) => unwrap(meetingHttpClient.get<Recording[]>(`api/meetings/${id}/recordings`));

export const getRecordingUrl = (id: string, recordingId: string) =>
  unwrap(meetingHttpClient.get<{ url: string; expiresUtc: string }>(`api/meetings/${id}/recordings/${recordingId}/url`));

export const updateRecording = (id: string, recordingId: string, visibility: RecordingVisibility) =>
  unwrap(meetingHttpClient.put<Recording>(`api/meetings/${id}/recordings/${recordingId}`, { visibility }));

export const deleteRecording = (id: string, recordingId: string) =>
  unwrap(meetingHttpClient.delete(`api/meetings/${id}/recordings/${recordingId}`));

export const startRecording = (id: string) => unwrap(meetingHttpClient.post<Recording>(`api/meetings/${id}/recordings/start`));

export const stopRecording = (id: string) => unwrap(meetingHttpClient.post(`api/meetings/${id}/recordings/stop`));

// ── Chat ────────────────────────────────────────────────────────────────────

export const listChat = (id: string) => unwrap(meetingHttpClient.get<ChatMessage[]>(`api/meetings/${id}/chat`));

export const postChat = (id: string, body: string, announcement = false) =>
  unwrap(meetingHttpClient.post<ChatMessage>(`api/meetings/${id}/chat`, { body, announcement }));

export const pinChat = (id: string, messageId: string, isPinned: boolean) =>
  unwrap(meetingHttpClient.patch(`api/meetings/${id}/chat/${messageId}`, { isPinned }));

export const deleteChat = (id: string, messageId: string) =>
  unwrap(meetingHttpClient.delete(`api/meetings/${id}/chat/${messageId}`));

export const toggleChat = (id: string, enabled: boolean) =>
  unwrap(meetingHttpClient.put(`api/meetings/${id}/chat/enabled`, { enabled }));

// ── Series ──────────────────────────────────────────────────────────────────

export const getSeries = (id: string) => unwrap(meetingHttpClient.get<SeriesDetail>(`api/meeting-series/${id}`));

export const endSeries = (id: string, reason?: string) =>
  unwrap(meetingHttpClient.post<SeriesDetail>(`api/meeting-series/${id}/end`, { reason }));

// ── Reports & settings ──────────────────────────────────────────────────────

export interface ReportFilters {
  from?: string;
  to?: string;
  sectionId?: string;
  type?: MeetingType;
}

export const getMeetingReport = (filters: ReportFilters) =>
  unwrap(meetingHttpClient.get<MeetingReport>("api/meeting-reports/summary", { params: filters }));

export const getStudentAttendanceReport = (filters: ReportFilters) =>
  unwrap(meetingHttpClient.get<StudentAttendanceRow[]>("api/meeting-reports/attendance", { params: filters }));

export const getTeacherReport = (filters: ReportFilters) =>
  unwrap(meetingHttpClient.get<TeacherReportRow[]>("api/meeting-reports/teachers", { params: filters }));

/** Downloads a CSV/Excel export through the authenticated client (a plain link can't carry the token). */
export async function downloadReport(kind: "attendance" | "teachers", format: "csv" | "xlsx", filters: ReportFilters) {
  const response = await meetingHttpClient
    .get<Blob>(`api/meeting-reports/${kind}`, { params: { ...filters, format }, responseType: "blob" })
    .catch((err) => {
      throw new Error(extractApiErrorMessage(err));
    });
  const disposition = String(response.headers["content-disposition"] ?? "");
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? `${kind}.${format}`;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = decodeURIComponent(name);
  link.click();
  URL.revokeObjectURL(url);
}

export const getMeetingSettings = () => unwrap(meetingHttpClient.get<MeetingSettings>("api/meeting-settings"));

export const updateMeetingSettings = (settings: Omit<MeetingSettings, "recordingAvailable">) =>
  unwrap(meetingHttpClient.put<MeetingSettings>("api/meeting-settings", settings));

// ── AcademicService lookups used by the schedule form ───────────────────────

export interface SectionOption {
  id: string;
  classId: string;
  label: string;
}

interface ApiSection {
  id: string;
  name: string;
  classId: string;
}
interface ApiClass {
  id: string;
  name: string;
}
interface ApiSubject {
  id: string;
  name: string;
  classIds: string[];
}

export async function listSectionOptions(): Promise<SectionOption[]> {
  const [sections, classes] = await Promise.all([
    unwrap(academicHttpClient.get<ApiSection[]>("api/sections")),
    unwrap(academicHttpClient.get<ApiClass[]>("api/classes")),
  ]);
  const className = new Map(classes.map((c) => [c.id, c.name] as const));
  return sections
    .map((s) => ({ id: s.id, classId: s.classId, label: `${className.get(s.classId) ?? "Class"} · ${s.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export const listSubjectOptions = () => unwrap(academicHttpClient.get<ApiSubject[]>("api/subjects"));

/** Linked people only - the ones who can actually be invited. Staff-only on the server. */
export const searchDirectory = (search: string, type?: "Student" | "Guardian" | "Staff") =>
  unwrap(academicHttpClient.get<DirectoryPerson[]>("api/people", { params: { search: search || undefined, type, take: 30 } }));
