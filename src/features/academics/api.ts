import { mockDelay } from "@/utils/mockDelay";
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

let academicYears = loadJson<AcademicYear[]>(ACADEMIC_YEARS_KEY, SEED_ACADEMIC_YEARS.map((y) => ({ ...y })));
let terms = loadJson<Term[]>(TERMS_KEY, SEED_TERMS.map((t) => ({ ...t })));
let departments = loadJson<Department[]>(DEPARTMENTS_KEY, SEED_DEPARTMENTS.map((d) => ({ ...d })));
let classes = loadJson<SchoolClass[]>(CLASSES_KEY, SEED_CLASSES.map((c) => ({ ...c })));
let sections = loadJson<Section[]>(SECTIONS_KEY, SEED_SECTIONS.map((s) => ({ ...s })));
let subjects = loadJson<Subject[]>(SUBJECTS_KEY, SEED_SUBJECTS.map((s) => ({ ...s })));
let calendarEvents = loadJson<CalendarEvent[]>(CALENDAR_EVENTS_KEY, SEED_CALENDAR_EVENTS.map((e) => ({ ...e })));

const persistAcademicYears = () => saveJson(ACADEMIC_YEARS_KEY, academicYears);
const persistTerms = () => saveJson(TERMS_KEY, terms);
const persistDepartments = () => saveJson(DEPARTMENTS_KEY, departments);
const persistClasses = () => saveJson(CLASSES_KEY, classes);
const persistSections = () => saveJson(SECTIONS_KEY, sections);
const persistSubjects = () => saveJson(SUBJECTS_KEY, subjects);
const persistCalendarEvents = () => saveJson(CALENDAR_EVENTS_KEY, calendarEvents);

function requireEntity<T extends { id: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`${label} not found`);
  return found;
}

// ── Academic years ──────────────────────────────────────────────────────

export async function listAcademicYears(): Promise<AcademicYear[]> {
  return mockDelay([...academicYears], 350);
}

export async function createAcademicYear(values: AcademicYearFormValues): Promise<AcademicYear> {
  const year: AcademicYear = { id: genId("ay"), ...values };
  academicYears = values.isCurrent ? academicYears.map((y) => ({ ...y, isCurrent: false })) : academicYears;
  academicYears = [year, ...academicYears];
  persistAcademicYears();
  return mockDelay(year, 400);
}

export async function updateAcademicYear(id: string, values: AcademicYearFormValues): Promise<AcademicYear> {
  requireEntity(academicYears, id, "Academic year");
  academicYears = academicYears.map((y) => {
    if (values.isCurrent && y.id !== id) return { ...y, isCurrent: false };
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
  return mockDelay([...terms], 350);
}

export async function createTerm(values: TermFormValues): Promise<Term> {
  const term: Term = { id: genId("term"), ...values };
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
  return mockDelay([...departments], 300);
}

export async function createDepartment(values: DepartmentFormValues): Promise<Department> {
  const department: Department = { id: genId("dept"), ...values };
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
  return mockDelay([...classes], 350);
}

export async function createClass(values: SchoolClassFormValues): Promise<SchoolClass> {
  const schoolClass: SchoolClass = { id: genId("class"), ...values };
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
  return mockDelay([...sections], 350);
}

export async function createSection(values: SectionFormValues): Promise<Section> {
  const section: Section = { id: genId("sec"), ...values };
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
  return mockDelay([...subjects], 350);
}

export async function createSubject(values: SubjectFormValues): Promise<Subject> {
  const subject: Subject = { id: genId("subj"), ...values };
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
  return mockDelay([...calendarEvents], 350);
}

export async function createCalendarEvent(values: CalendarEventFormValues): Promise<CalendarEvent> {
  const event: CalendarEvent = { id: genId("cal"), ...values };
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
