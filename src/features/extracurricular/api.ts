import { campusHttpClient } from "@/lib/httpClient";
import type {
  Achievement,
  AchievementInput,
  AchievementStatus,
  Activity,
  ActivityEvent,
  ActivityInput,
  ActivityStatus,
  AttendanceRow,
  AttendanceSummary,
  Campaign,
  CampaignInput,
  Category,
  Dashboard,
  Enrollment,
  EnrollmentStatus,
  EventInput,
  EventResult,
  EventStatus,
  Group,
  GroupHistory,
  GroupKind,
  GroupMember,
  Measurement,
  MeasurementInput,
  MyOverview,
  NonParticipant,
  Page,
  ParticipantType,
  Registration,
  Session,
  SessionAction,
  SessionAttendanceStatus,
  SessionInput,
  SessionStatus,
  Settings,
  ShuffleScope,
  ShuffleStrategy,
  ShufflePreview,
  Team,
  TeamMember,
  TeamRole,
  UnassignedStudent,
} from "./types";

const base = "/api/extracurricular";

/** Query-string parameters without the empty ones, so the server never sees "?search=&status=". */
function clean(params: Record<string, string | number | boolean | undefined | null>) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const get = async <T>(url: string, params?: Record<string, string | number | boolean | undefined | null>) =>
  (await campusHttpClient.get<T>(`${base}${url}`, { params: params ? clean(params) : undefined })).data;
const post = async <T>(url: string, body?: unknown, params?: Record<string, string | number | boolean | undefined | null>) =>
  (await campusHttpClient.post<T>(`${base}${url}`, body ?? {}, { params: params ? clean(params) : undefined })).data;
const put = async <T>(url: string, body?: unknown) => (await campusHttpClient.put<T>(`${base}${url}`, body ?? {})).data;
const del = async <T = void>(url: string, params?: Record<string, string | number | boolean | undefined | null>) =>
  (await campusHttpClient.delete<T>(`${base}${url}`, { params: params ? clean(params) : undefined })).data;

// ── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = (academicYear?: string) => get<Dashboard>("/dashboard", { academicYear });
export const getMyOverview = () => get<MyOverview>("/me");
export const listNonParticipants = (academicYear?: string, className?: string) => get<NonParticipant[]>("/non-participants", { academicYear, className });

// ── Settings and categories ─────────────────────────────────────────────────
export const getSettings = () => get<Settings>("/settings");
export const saveSettings = (settings: Settings) => put<Settings>("/settings", settings);
export const listCategories = (includeInactive = true) => get<Category[]>("/categories", { includeInactive });
export const createCategory = (c: Pick<Category, "name" | "color" | "isActive" | "isSustainability">) => post<Category>("/categories", c);
export const updateCategory = (id: string, c: Pick<Category, "name" | "color" | "isActive" | "isSustainability">) => put<Category>(`/categories/${id}`, c);
export const reorderCategories = (ids: string[]) => put<void>("/categories/order", { ids });
export const deleteCategory = (id: string) => del(`/categories/${id}`);

// ── Activities ──────────────────────────────────────────────────────────────
export interface ActivityFilters {
  search?: string;
  categoryId?: string;
  status?: ActivityStatus;
  academicYear?: string;
  openOnly?: boolean;
  pageNumber?: number;
  pageSize?: number;
}
export const listActivities = (f: ActivityFilters = {}) => get<Page<Activity>>("/activities", { ...f, pageNumber: f.pageNumber ?? 1, pageSize: f.pageSize ?? 25 });
export const getActivity = (id: string) => get<Activity>(`/activities/${id}`);
export const createActivity = (a: ActivityInput) => post<Activity>("/activities", a);
export const updateActivity = (id: string, a: ActivityInput) => put<Activity>(`/activities/${id}`, a);
export const deleteActivity = (id: string) => del<{ removed: boolean }>(`/activities/${id}`);

// ── Groups ──────────────────────────────────────────────────────────────────
export const listGroups = (academicYear?: string, kind?: GroupKind) => get<Group[]>("/groups", { academicYear, kind });
export const createGroupSet = (input: { kind: GroupKind; academicYear: string; count: number; namePrefix: string; names?: string[] | null; colors?: string[] | null }) =>
  post<Group[]>("/groups/set", input);
export const saveGroup = (group: Pick<Group, "name" | "code" | "color" | "kind" | "academicYear" | "sortOrder"> & { id?: string }) =>
  group.id ? put<Group>(`/groups/${group.id}`, group) : post<Group>("/groups", group);
export const deleteGroup = (id: string) => del(`/groups/${id}`);
export const setGroupsLocked = (groupIds: string[], locked: boolean) => put<{ changed: number }>("/groups/lock", { groupIds, locked });
export const listGroupMembers = (groupId: string) => get<GroupMember[]>(`/groups/${groupId}/members`);
export const listUnassigned = (academicYear: string, kind: GroupKind, search?: string) => get<UnassignedStudent[]>("/groups/unassigned", { academicYear, kind, search });
export const assignStudents = (groupId: string, studentIds: string[], override = false) => post<{ assigned: number }>(`/groups/${groupId}/members`, { studentIds, override });
export const removeFromGroup = (groupId: string, studentId: string, override = false) => del(`/groups/${groupId}/members/${studentId}`, { override });
export interface ShuffleRequest {
  academicYear: string;
  kind: GroupKind;
  groupIds?: string[] | null;
  strategy: ShuffleStrategy;
  scope: ShuffleScope;
  seed?: number | null;
  classNames?: string[] | null;
}
export const previewShuffle = (r: ShuffleRequest) => post<ShufflePreview>("/groups/shuffle/preview", r);
export const applyShuffle = (r: { academicYear: string; kind: GroupKind; moves: { studentId: string; toGroupId: string }[]; note?: string | null }) =>
  post<{ batchId: string }>("/groups/shuffle/apply", r);
export const listGroupHistory = (studentId?: string, batchId?: string, pageNumber = 1, pageSize = 50) => get<Page<GroupHistory>>("/groups/history", { studentId, batchId, pageNumber, pageSize });

// ── Enrollment ──────────────────────────────────────────────────────────────
export interface EnrollmentFilters {
  activityId?: string;
  studentId?: string;
  status?: EnrollmentStatus;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}
export const listEnrollments = (f: EnrollmentFilters = {}) => get<Page<Enrollment>>("/enrollments", { ...f, pageNumber: f.pageNumber ?? 1, pageSize: f.pageSize ?? 25 });
export const requestEnrollment = (r: { activityId: string; studentId: string; note?: string | null; consentGiven: boolean }) => post<Enrollment>("/enrollments", r);
export const decideEnrollments = (ids: string[], approve: boolean, note?: string | null) => post<Enrollment[]>("/enrollments/decide", { ids, approve, note });
export const withdrawEnrollment = (id: string) => post<Enrollment>(`/enrollments/${id}/withdraw`);
export const completeEnrollment = (id: string) => post<Enrollment>(`/enrollments/${id}/complete`);

// ── Teams ───────────────────────────────────────────────────────────────────
export const listTeams = (activityId?: string, includeInactive = false) => get<Team[]>("/teams", { activityId, includeInactive });
export type TeamInput = Pick<Team, "activityId" | "name" | "code" | "color" | "level" | "coachName" | "maxMembers" | "description" | "isActive"> & { coachStaffId?: string | null };
export const saveTeam = (team: TeamInput & { id?: string }) => (team.id ? put<Team>(`/teams/${team.id}`, team) : post<Team>("/teams", team));
export const deleteTeam = (id: string) => del<{ removed: boolean }>(`/teams/${id}`);
export const listTeamMembers = (teamId: string, includeFormer = false) => get<TeamMember[]>(`/teams/${teamId}/members`, { includeFormer });
export const saveTeamMember = (teamId: string, m: { memberId?: string | null; studentId: string; role: TeamRole; isSubstitute: boolean; position?: string | null; jerseyNumber?: number | null }) =>
  post<TeamMember>(`/teams/${teamId}/members`, m);
export const leaveTeam = (memberId: string, toTeamId?: string) => post<void>(`/team-members/${memberId}/leave`, {}, { toTeamId });

// ── Sessions and attendance ─────────────────────────────────────────────────
export interface SessionFilters {
  from?: string;
  to?: string;
  activityId?: string;
  teamId?: string;
  status?: SessionStatus;
  mineOnly?: boolean;
  pageNumber?: number;
  pageSize?: number;
}
export const listSessions = (f: SessionFilters = {}) => get<Page<Session>>("/sessions", { ...f, pageNumber: f.pageNumber ?? 1, pageSize: f.pageSize ?? 100 });
export const createSessions = (s: SessionInput) => post<Session[]>("/sessions", s);
export const updateSession = (id: string, s: SessionInput) => put<Session[]>(`/sessions/${id}`, s);
export const changeSession = (id: string, action: SessionAction, reason?: string) => post<Session>(`/sessions/${id}/status`, { action, reason });
export const setSessionInstructor = (id: string, instructorName: string, instructorStaffId?: string | null) => put<void>(`/sessions/${id}/instructor`, { instructorName, instructorStaffId });
export const deleteSession = (id: string) => del(`/sessions/${id}`);
export const getSessionAttendance = (id: string) => get<AttendanceRow[]>(`/sessions/${id}/attendance`);
export const saveSessionAttendance = (id: string, marks: { studentId: string; status: SessionAttendanceStatus; note?: string | null }[]) => put<{ saved: number }>(`/sessions/${id}/attendance`, { marks });
export const getAttendanceSummary = (f: { activityId?: string; studentId?: string; from?: string; to?: string } = {}) => get<AttendanceSummary[]>("/attendance/summary", f);

// ── Events, results, achievements ───────────────────────────────────────────
export interface EventFilters {
  from?: string;
  to?: string;
  status?: EventStatus;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}
export const listEvents = (f: EventFilters = {}) => get<Page<ActivityEvent>>("/events", { ...f, pageNumber: f.pageNumber ?? 1, pageSize: f.pageSize ?? 50 });
export const saveEvent = (e: EventInput & { id?: string }) => (e.id ? put<ActivityEvent>(`/events/${e.id}`, e) : post<ActivityEvent>("/events", e));
export const deleteEvent = (id: string) => del(`/events/${id}`);
export const listRegistrations = (eventId: string) => get<Registration[]>(`/events/${eventId}/registrations`);
export const registerForEvent = (eventId: string, participantType: ParticipantType, participantId: string) => post<Registration>(`/events/${eventId}/registrations`, { participantType, participantId });
export const unregister = (registrationId: string) => del(`/registrations/${registrationId}`);
export const listResults = (eventId: string) => get<EventResult[]>(`/events/${eventId}/results`);
export const saveResults = (eventId: string, results: EventResult[], rankByScore: boolean) => put<EventResult[]>(`/events/${eventId}/results`, { results, rankByScore });

export interface AchievementFilters {
  studentId?: string;
  status?: AchievementStatus;
  academicYear?: string;
  pageNumber?: number;
  pageSize?: number;
}
export const listAchievements = (f: AchievementFilters = {}) => get<Page<Achievement>>("/achievements", { ...f, pageNumber: f.pageNumber ?? 1, pageSize: f.pageSize ?? 50 });
export const saveAchievement = (a: AchievementInput & { id?: string }) => (a.id ? put<Achievement>(`/achievements/${a.id}`, a) : post<Achievement>("/achievements", a));
export const setAchievementStatus = (ids: string[], status: AchievementStatus) => post<{ changed: number }>("/achievements/status", { ids, status });
export const deleteAchievement = (id: string) => del(`/achievements/${id}`);

// ── Sustainability ──────────────────────────────────────────────────────────
export const listCampaigns = (search?: string, status?: ActivityStatus) => get<Campaign[]>("/sustainability/campaigns", { search, status });
export const saveCampaign = (c: CampaignInput & { id?: string }) => (c.id ? put<Campaign>(`/sustainability/campaigns/${c.id}`, c) : post<Campaign>("/sustainability/campaigns", c));
export const deleteCampaign = (id: string) => del(`/sustainability/campaigns/${id}`);
export const listMeasurements = (campaignId: string) => get<Measurement[]>(`/sustainability/campaigns/${campaignId}/measurements`);
export const saveMeasurement = (campaignId: string, m: MeasurementInput) => post<Measurement>(`/sustainability/campaigns/${campaignId}/measurements`, m);
export const verifyMeasurement = (id: string, verified: boolean) => post<Measurement>(`/sustainability/measurements/${id}/verify`, {}, { verified });
export const deleteMeasurement = (id: string) => del(`/sustainability/measurements/${id}`);
