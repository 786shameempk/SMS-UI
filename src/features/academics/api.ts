import { mockDelay } from "@/utils/mockDelay";
import {
  DEFAULT_TENANT_ID,
  defaultBranchIdForTenant,
  getCurrentBranchId,
  getCurrentTenantId,
  migrateLegacyRecordsToDefaultBranch,
  migrateLegacyRecordsToDefaultTenant,
  scopedToCurrentTenantAndBranch,
} from "@/utils/tenant";
import {
  SEED_ACADEMIC_YEARS,
  SEED_CALENDAR_EVENTS,
  SEED_CLASSES,
  SEED_DEPARTMENTS,
  SEED_SECTIONS,
  SEED_SUBJECTS,
  SEED_TERMS,
} from "./mock";
import type {
  AcademicYear,
  AcademicYearFormValues,
  CalendarEvent,
  CalendarEventFormValues,
  Department,
  DepartmentFormValues,
  MergeSectionsResult,
  SchoolClass,
  SchoolClassFormValues,
  Section,
  SectionFormValues,
  Subject,
  SubjectFormValues,
  Term,
  TermFormValues,
} from "./types";

const ACADEMIC_YEARS_KEY = "sms-mock-academic-years";
const TERMS_KEY = "sms-mock-terms";
const DEPARTMENTS_KEY = "sms-mock-departments";
const CLASSES_KEY = "sms-mock-classes";
const SECTIONS_KEY = "sms-mock-sections";
const SUBJECTS_KEY = "sms-mock-subjects";
const CALENDAR_EVENTS_KEY = "sms-mock-calendar-events";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const stampDefault = <T extends object>(records: T[]) =>
  records.map((r) => ({ ...r, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID) }));
const migrate = <T extends { tenantId: string; branchId?: string }>(records: T[]) =>
  migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(records));

let academicYears = migrate(loadJson<AcademicYear[]>(ACADEMIC_YEARS_KEY, stampDefault(SEED_ACADEMIC_YEARS)));
let terms = migrate(loadJson<Term[]>(TERMS_KEY, stampDefault(SEED_TERMS)));
let departments = migrate(loadJson<Department[]>(DEPARTMENTS_KEY, stampDefault(SEED_DEPARTMENTS)));
let classes = migrate(loadJson<SchoolClass[]>(CLASSES_KEY, stampDefault(SEED_CLASSES)));
let sections = migrate(loadJson<Section[]>(SECTIONS_KEY, stampDefault(SEED_SECTIONS)));
let subjects = migrate(loadJson<Subject[]>(SUBJECTS_KEY, stampDefault(SEED_SUBJECTS)));
let calendarEvents = migrate(loadJson<CalendarEvent[]>(CALENDAR_EVENTS_KEY, stampDefault(SEED_CALENDAR_EVENTS)));

const persistAcademicYears = () => saveJson(ACADEMIC_YEARS_KEY, academicYears);
const persistTerms = () => saveJson(TERMS_KEY, terms);
const persistDepartments = () => saveJson(DEPARTMENTS_KEY, departments);
const persistClasses = () => saveJson(CLASSES_KEY, classes);
const persistSections = () => saveJson(SECTIONS_KEY, sections);
const persistSubjects = () => saveJson(SUBJECTS_KEY, subjects);
const persistCalendarEvents = () => saveJson(CALENDAR_EVENTS_KEY, calendarEvents);

function requireEntity<T extends { id: string; tenantId: string; branchId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId() && item.branchId === getCurrentBranchId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

// ── Academic years ──────────────────────────────────────────────────────

export async function listAcademicYears(): Promise<AcademicYear[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(academicYears), 350);
}

export async function createAcademicYear(values: AcademicYearFormValues): Promise<AcademicYear> {
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const year: AcademicYear = { id: genId("ay"), tenantId, branchId, ...values };
  academicYears = values.isCurrent
    ? academicYears.map((y) => (y.tenantId === tenantId && y.branchId === branchId ? { ...y, isCurrent: false } : y))
    : academicYears;
  academicYears = [year, ...academicYears];
  persistAcademicYears();
  return mockDelay(year, 400);
}

export async function updateAcademicYear(id: string, values: AcademicYearFormValues): Promise<AcademicYear> {
  requireEntity(academicYears, id, "Academic year");
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  academicYears = academicYears.map((y) => {
    if (values.isCurrent && y.id !== id && y.tenantId === tenantId && y.branchId === branchId) return { ...y, isCurrent: false };
    return y.id === id ? { ...y, ...values } : y;
  });
  persistAcademicYears();
  return mockDelay(requireEntity(academicYears, id, "Academic year"), 400);
}

export async function deleteAcademicYear(id: string): Promise<void> {
  requireEntity(academicYears, id, "Academic year");
  academicYears = academicYears.filter((y) => y.id !== id);
  persistAcademicYears();
  return mockDelay(undefined, 350);
}

// ── Terms ────────────────────────────────────────────────────────────────

export async function listTerms(): Promise<Term[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(terms), 350);
}

export async function createTerm(values: TermFormValues): Promise<Term> {
  const term: Term = { id: genId("term"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  terms = [term, ...terms];
  persistTerms();
  return mockDelay(term, 400);
}

export async function updateTerm(id: string, values: TermFormValues): Promise<Term> {
  requireEntity(terms, id, "Term");
  terms = terms.map((t) => (t.id === id ? { ...t, ...values } : t));
  persistTerms();
  return mockDelay(requireEntity(terms, id, "Term"), 400);
}

export async function deleteTerm(id: string): Promise<void> {
  requireEntity(terms, id, "Term");
  terms = terms.filter((t) => t.id !== id);
  persistTerms();
  return mockDelay(undefined, 350);
}

// ── Departments / streams ────────────────────────────────────────────────

export async function listDepartments(): Promise<Department[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(departments), 300);
}

export async function createDepartment(values: DepartmentFormValues): Promise<Department> {
  const department: Department = { id: genId("dept"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  departments = [department, ...departments];
  persistDepartments();
  return mockDelay(department, 400);
}

export async function updateDepartment(id: string, values: DepartmentFormValues): Promise<Department> {
  requireEntity(departments, id, "Department");
  departments = departments.map((d) => (d.id === id ? { ...d, ...values } : d));
  persistDepartments();
  return mockDelay(requireEntity(departments, id, "Department"), 400);
}

export async function deleteDepartment(id: string): Promise<void> {
  requireEntity(departments, id, "Department");
  departments = departments.filter((d) => d.id !== id);
  persistDepartments();
  return mockDelay(undefined, 350);
}

// ── Classes ──────────────────────────────────────────────────────────────

export async function listClasses(): Promise<SchoolClass[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(classes), 350);
}

export async function createClass(values: SchoolClassFormValues): Promise<SchoolClass> {
  const schoolClass: SchoolClass = { id: genId("class"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  classes = [schoolClass, ...classes];
  persistClasses();
  return mockDelay(schoolClass, 400);
}

export async function updateClass(id: string, values: SchoolClassFormValues): Promise<SchoolClass> {
  requireEntity(classes, id, "Class");
  classes = classes.map((c) => (c.id === id ? { ...c, ...values } : c));
  persistClasses();
  return mockDelay(requireEntity(classes, id, "Class"), 400);
}

export async function deleteClass(id: string): Promise<void> {
  requireEntity(classes, id, "Class");
  classes = classes.filter((c) => c.id !== id);
  sections = sections.filter((s) => s.classId !== id);
  persistClasses();
  persistSections();
  return mockDelay(undefined, 350);
}

// ── Sections ─────────────────────────────────────────────────────────────

export async function listSections(): Promise<Section[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(sections), 350);
}

export async function createSection(values: SectionFormValues): Promise<Section> {
  const section: Section = { id: genId("sec"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  sections = [section, ...sections];
  persistSections();
  return mockDelay(section, 400);
}

export async function updateSection(id: string, values: SectionFormValues): Promise<Section> {
  requireEntity(sections, id, "Section");
  sections = sections.map((s) => (s.id === id ? { ...s, ...values } : s));
  persistSections();
  return mockDelay(requireEntity(sections, id, "Section"), 400);
}

export async function deleteSection(id: string): Promise<void> {
  requireEntity(sections, id, "Section");
  sections = sections.filter((s) => s.id !== id);
  persistSections();
  return mockDelay(undefined, 350);
}

export async function mergeSections(primarySectionId: string, secondarySectionId: string): Promise<MergeSectionsResult> {
  const primary = requireEntity(sections, primarySectionId, "Section");
  const secondary = requireEntity(sections, secondarySectionId, "Section");
  if (primary.classId !== secondary.classId) {
    await mockDelay(undefined, 300);
    throw new Error("Sections must belong to the same class to merge");
  }
  const merged: Section = {
    ...primary,
    capacity: primary.capacity + secondary.capacity,
    currentStrength: primary.currentStrength + secondary.currentStrength,
  };
  sections = sections.filter((s) => s.id !== secondary.id).map((s) => (s.id === primary.id ? merged : s));
  persistSections();
  return mockDelay({ mergedSection: merged }, 500);
}

// ── Subjects ─────────────────────────────────────────────────────────────

export async function listSubjects(): Promise<Subject[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(subjects), 350);
}

export async function createSubject(values: SubjectFormValues): Promise<Subject> {
  const subject: Subject = { id: genId("subj"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  subjects = [subject, ...subjects];
  persistSubjects();
  return mockDelay(subject, 400);
}

export async function updateSubject(id: string, values: SubjectFormValues): Promise<Subject> {
  requireEntity(subjects, id, "Subject");
  subjects = subjects.map((s) => (s.id === id ? { ...s, ...values } : s));
  persistSubjects();
  return mockDelay(requireEntity(subjects, id, "Subject"), 400);
}

export async function deleteSubject(id: string): Promise<void> {
  requireEntity(subjects, id, "Subject");
  subjects = subjects.filter((s) => s.id !== id);
  persistSubjects();
  return mockDelay(undefined, 350);
}

// ── Academic calendar ────────────────────────────────────────────────────

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  return mockDelay(scopedToCurrentTenantAndBranch(calendarEvents), 350);
}

export async function createCalendarEvent(values: CalendarEventFormValues): Promise<CalendarEvent> {
  const event: CalendarEvent = { id: genId("cal"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  calendarEvents = [event, ...calendarEvents];
  persistCalendarEvents();
  return mockDelay(event, 400);
}

export async function updateCalendarEvent(id: string, values: CalendarEventFormValues): Promise<CalendarEvent> {
  requireEntity(calendarEvents, id, "Calendar event");
  calendarEvents = calendarEvents.map((e) => (e.id === id ? { ...e, ...values } : e));
  persistCalendarEvents();
  return mockDelay(requireEntity(calendarEvents, id, "Calendar event"), 400);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  requireEntity(calendarEvents, id, "Calendar event");
  calendarEvents = calendarEvents.filter((e) => e.id !== id);
  persistCalendarEvents();
  return mockDelay(undefined, 350);
}
