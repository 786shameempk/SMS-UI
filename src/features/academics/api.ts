import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  AcademicYear,
  AcademicYearFormValues,
  AcademicYearStatus,
  CalendarEvent,
  CalendarEventFormValues,
  CalendarEventType,
  Department,
  DepartmentFormValues,
  MergeSectionsResult,
  SchoolClass,
  SchoolClassFormValues,
  Section,
  SectionFormValues,
  Subject,
  SubjectFormValues,
  SubjectType,
  Term,
  TermFormValues,
  TermStatus,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// AcademicService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase/snake_case unions. Small lookup tables keep this a one-line mapping at each call site
// rather than a generic (and fragile) casing transform.

const ACADEMIC_YEAR_STATUS_TO_API: Record<AcademicYearStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  closed: "Closed",
};
const ACADEMIC_YEAR_STATUS_FROM_API: Record<string, AcademicYearStatus> = {
  Upcoming: "upcoming",
  Active: "active",
  Closed: "closed",
};

const TERM_STATUS_TO_API: Record<TermStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
};
const TERM_STATUS_FROM_API: Record<string, TermStatus> = {
  Upcoming: "upcoming",
  Ongoing: "ongoing",
  Completed: "completed",
};

const SUBJECT_TYPE_TO_API: Record<SubjectType, string> = { core: "Core", elective: "Elective" };
const SUBJECT_TYPE_FROM_API: Record<string, SubjectType> = { Core: "core", Elective: "elective" };

const CALENDAR_EVENT_TYPE_TO_API: Record<CalendarEventType, string> = {
  term_start: "TermStart",
  term_end: "TermEnd",
  exam: "Exam",
  holiday: "Holiday",
  other: "Other",
};
const CALENDAR_EVENT_TYPE_FROM_API: Record<string, CalendarEventType> = {
  TermStart: "term_start",
  TermEnd: "term_end",
  Exam: "exam",
  Holiday: "holiday",
  Other: "other",
};

// ── API response shapes (AcademicService DTOs) ──────────────────────────────

interface ApiAcademicYear {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
}

interface ApiTerm {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface ApiDepartment {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  description: string | null;
}

interface ApiSchoolClass {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  departmentId: string | null;
  academicYearId: string;
}

interface ApiSection {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  classId: string;
  classTeacherName: string | null;
  classTeacherStaffId: string | null;
  capacity: number;
  currentStrength: number;
}

interface ApiSubject {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  code: string;
  type: string;
  classIds: string[];
}

interface ApiCalendarEvent {
  id: string;
  tenantId: string;
  branchId: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string | null;
  academicYearId: string | null;
  description: string | null;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const mapAcademicYear = (dto: ApiAcademicYear): AcademicYear => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  startDate: dto.startDate,
  endDate: dto.endDate,
  isCurrent: dto.isCurrent,
  status: ACADEMIC_YEAR_STATUS_FROM_API[dto.status] ?? "upcoming",
});

const mapTerm = (dto: ApiTerm): Term => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  academicYearId: dto.academicYearId,
  startDate: dto.startDate,
  endDate: dto.endDate,
  status: TERM_STATUS_FROM_API[dto.status] ?? "upcoming",
});

const mapDepartment = (dto: ApiDepartment): Department => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  description: dto.description ?? undefined,
});

const mapSchoolClass = (dto: ApiSchoolClass): SchoolClass => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  departmentId: dto.departmentId ?? undefined,
  academicYearId: dto.academicYearId,
});

const mapSection = (dto: ApiSection): Section => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  classId: dto.classId,
  classTeacherName: dto.classTeacherName ?? undefined,
  classTeacherStaffId: dto.classTeacherStaffId ?? undefined,
  capacity: dto.capacity,
  currentStrength: dto.currentStrength,
});

const mapSubject = (dto: ApiSubject): Subject => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  code: dto.code,
  type: SUBJECT_TYPE_FROM_API[dto.type] ?? "core",
  classIds: dto.classIds,
});

const mapCalendarEvent = (dto: ApiCalendarEvent): CalendarEvent => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  title: dto.title,
  type: CALENDAR_EVENT_TYPE_FROM_API[dto.type] ?? "other",
  startDate: dto.startDate,
  endDate: dto.endDate ?? undefined,
  academicYearId: dto.academicYearId ?? undefined,
  description: dto.description ?? undefined,
});

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Academic years ──────────────────────────────────────────────────────

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const years = await unwrap(academicHttpClient.get<ApiAcademicYear[]>("/api/academicyears"));
  return years.map(mapAcademicYear);
}

export async function createAcademicYear(values: AcademicYearFormValues): Promise<AcademicYear> {
  const dto = await unwrap(
    academicHttpClient.post<ApiAcademicYear>("/api/academicyears", {
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      isCurrent: values.isCurrent,
      status: ACADEMIC_YEAR_STATUS_TO_API[values.status],
    }),
  );
  return mapAcademicYear(dto);
}

export async function updateAcademicYear(id: string, values: AcademicYearFormValues): Promise<AcademicYear> {
  const dto = await unwrap(
    academicHttpClient.put<ApiAcademicYear>(`/api/academicyears/${id}`, {
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      isCurrent: values.isCurrent,
      status: ACADEMIC_YEAR_STATUS_TO_API[values.status],
    }),
  );
  return mapAcademicYear(dto);
}

export async function deleteAcademicYear(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/academicyears/${id}`));
}

// ── Terms ────────────────────────────────────────────────────────────────

export async function listTerms(): Promise<Term[]> {
  const terms = await unwrap(academicHttpClient.get<ApiTerm[]>("/api/terms"));
  return terms.map(mapTerm);
}

export async function createTerm(values: TermFormValues): Promise<Term> {
  const dto = await unwrap(
    academicHttpClient.post<ApiTerm>("/api/terms", {
      name: values.name,
      academicYearId: values.academicYearId,
      startDate: values.startDate,
      endDate: values.endDate,
      status: TERM_STATUS_TO_API[values.status],
    }),
  );
  return mapTerm(dto);
}

export async function updateTerm(id: string, values: TermFormValues): Promise<Term> {
  const dto = await unwrap(
    academicHttpClient.put<ApiTerm>(`/api/terms/${id}`, {
      name: values.name,
      academicYearId: values.academicYearId,
      startDate: values.startDate,
      endDate: values.endDate,
      status: TERM_STATUS_TO_API[values.status],
    }),
  );
  return mapTerm(dto);
}

export async function deleteTerm(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/terms/${id}`));
}

// ── Departments / streams ────────────────────────────────────────────────

export async function listDepartments(): Promise<Department[]> {
  const departments = await unwrap(academicHttpClient.get<ApiDepartment[]>("/api/departments"));
  return departments.map(mapDepartment);
}

export async function createDepartment(values: DepartmentFormValues): Promise<Department> {
  const dto = await unwrap(
    academicHttpClient.post<ApiDepartment>("/api/departments", {
      name: values.name,
      description: values.description ?? null,
    }),
  );
  return mapDepartment(dto);
}

export async function updateDepartment(id: string, values: DepartmentFormValues): Promise<Department> {
  const dto = await unwrap(
    academicHttpClient.put<ApiDepartment>(`/api/departments/${id}`, {
      name: values.name,
      description: values.description ?? null,
    }),
  );
  return mapDepartment(dto);
}

export async function deleteDepartment(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/departments/${id}`));
}

// ── Classes ──────────────────────────────────────────────────────────────

export async function listClasses(): Promise<SchoolClass[]> {
  const classes = await unwrap(academicHttpClient.get<ApiSchoolClass[]>("/api/classes"));
  return classes.map(mapSchoolClass);
}

export async function createClass(values: SchoolClassFormValues): Promise<SchoolClass> {
  const dto = await unwrap(
    academicHttpClient.post<ApiSchoolClass>("/api/classes", {
      name: values.name,
      departmentId: values.departmentId ?? null,
      academicYearId: values.academicYearId,
    }),
  );
  return mapSchoolClass(dto);
}

export async function updateClass(id: string, values: SchoolClassFormValues): Promise<SchoolClass> {
  const dto = await unwrap(
    academicHttpClient.put<ApiSchoolClass>(`/api/classes/${id}`, {
      name: values.name,
      departmentId: values.departmentId ?? null,
      academicYearId: values.academicYearId,
    }),
  );
  return mapSchoolClass(dto);
}

/** Unlike the old mock, the backend enforces referential integrity: deleting a class that still has
 * sections is rejected (Section→Class is a Restrict FK), not silently cascaded. */
export async function deleteClass(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/classes/${id}`));
}

// ── Sections ─────────────────────────────────────────────────────────────

export async function listSections(): Promise<Section[]> {
  const sections = await unwrap(academicHttpClient.get<ApiSection[]>("/api/sections"));
  return sections.map(mapSection);
}

export async function createSection(values: SectionFormValues): Promise<Section> {
  const dto = await unwrap(
    academicHttpClient.post<ApiSection>("/api/sections", {
      name: values.name,
      classId: values.classId,
      classTeacherName: values.classTeacherName ?? null,
      classTeacherStaffId: values.classTeacherStaffId ?? null,
      capacity: values.capacity,
      currentStrength: values.currentStrength,
    }),
  );
  return mapSection(dto);
}

export async function updateSection(id: string, values: SectionFormValues): Promise<Section> {
  const dto = await unwrap(
    academicHttpClient.put<ApiSection>(`/api/sections/${id}`, {
      name: values.name,
      classId: values.classId,
      classTeacherName: values.classTeacherName ?? null,
      classTeacherStaffId: values.classTeacherStaffId ?? null,
      capacity: values.capacity,
      currentStrength: values.currentStrength,
    }),
  );
  return mapSection(dto);
}

export async function deleteSection(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/sections/${id}`));
}

export async function mergeSections(primarySectionId: string, secondarySectionId: string): Promise<MergeSectionsResult> {
  const dto = await unwrap(
    academicHttpClient.post<ApiSection>("/api/sections/merge", { primarySectionId, secondarySectionId }),
  );
  return { mergedSection: mapSection(dto) };
}

// ── Subjects ─────────────────────────────────────────────────────────────

export async function listSubjects(): Promise<Subject[]> {
  const subjects = await unwrap(academicHttpClient.get<ApiSubject[]>("/api/subjects"));
  return subjects.map(mapSubject);
}

export async function createSubject(values: SubjectFormValues): Promise<Subject> {
  const dto = await unwrap(
    academicHttpClient.post<ApiSubject>("/api/subjects", {
      name: values.name,
      code: values.code,
      type: SUBJECT_TYPE_TO_API[values.type],
      classIds: values.classIds,
    }),
  );
  return mapSubject(dto);
}

export async function updateSubject(id: string, values: SubjectFormValues): Promise<Subject> {
  const dto = await unwrap(
    academicHttpClient.put<ApiSubject>(`/api/subjects/${id}`, {
      name: values.name,
      code: values.code,
      type: SUBJECT_TYPE_TO_API[values.type],
      classIds: values.classIds,
    }),
  );
  return mapSubject(dto);
}

export async function deleteSubject(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/subjects/${id}`));
}

// ── Academic calendar ────────────────────────────────────────────────────

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const events = await unwrap(academicHttpClient.get<ApiCalendarEvent[]>("/api/calendarevents"));
  return events.map(mapCalendarEvent);
}

export async function createCalendarEvent(values: CalendarEventFormValues): Promise<CalendarEvent> {
  const dto = await unwrap(
    academicHttpClient.post<ApiCalendarEvent>("/api/calendarevents", {
      title: values.title,
      type: CALENDAR_EVENT_TYPE_TO_API[values.type],
      startDate: values.startDate,
      endDate: values.endDate ?? null,
      academicYearId: values.academicYearId ?? null,
      description: values.description ?? null,
    }),
  );
  return mapCalendarEvent(dto);
}

export async function updateCalendarEvent(id: string, values: CalendarEventFormValues): Promise<CalendarEvent> {
  const dto = await unwrap(
    academicHttpClient.put<ApiCalendarEvent>(`/api/calendarevents/${id}`, {
      title: values.title,
      type: CALENDAR_EVENT_TYPE_TO_API[values.type],
      startDate: values.startDate,
      endDate: values.endDate ?? null,
      academicYearId: values.academicYearId ?? null,
      description: values.description ?? null,
    }),
  );
  return mapCalendarEvent(dto);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete(`/api/calendarevents/${id}`));
}
