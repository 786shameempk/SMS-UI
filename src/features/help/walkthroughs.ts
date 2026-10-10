import type { AppRoute } from "@/app/routeRegistry";

/**
 * How a step finds the control it points at: by the visible words a person sees, never by CSS classes, so a restyle does not
 * break a tour. A control that is not on screen yet (a dialog nobody has opened) is simply not found, and the step then shows
 * its `ifMissing` hint instead of a highlight.
 */
export type TourTarget =
  | { kind: "button"; text: string }
  | { kind: "label"; text: string }
  | { kind: "tab"; text: string };

export interface TourStep {
  title: string;
  body: string;
  target?: TourTarget;
  /** Shown instead of a highlight when the control is not on screen (for example, the dialog is not open yet). */
  ifMissing?: string;
}

export interface Tour {
  id: string;
  /** The article this walks through; every label and message must agree with it. */
  articleId: string;
  title: string;
  /** Screen the tour starts on, a registry route id. */
  routeId: string;
  steps: TourStep[];
}

export const TOURS: Tour[] = [
  {
    id: "register-student",
    articleId: "students-register",
    title: "Register a student",
    routeId: "students.list",
    steps: [
      { title: "Start the form", body: "Select Register student to open the form.", target: { kind: "button", text: "Register student" } },
      { title: "Student details", body: "Enter the First name, Last name, Date of birth and Gender.", target: { kind: "label", text: "First name" }, ifMissing: "Select Register student on the Students tab first, then continue." },
      { title: "Class placement", body: "Choose the Class, then the Section.", target: { kind: "label", text: "Class" }, ifMissing: "Open the Register student form first." },
      { title: "Guardian", body: "Enter the Address, Guardian name, Relation and Guardian phone. All are required.", target: { kind: "label", text: "Guardian name" }, ifMissing: "Open the Register student form first." },
      { title: "Optional emails", body: "Student email and Parent email are optional. When you are done, select Register student at the bottom of the form. A \"Student registered\" message confirms it.", target: { kind: "label", text: "Parent email" }, ifMissing: "Open the Register student form first." },
    ],
  },
  {
    id: "add-user",
    articleId: "users-add",
    title: "Add a user",
    routeId: "users.list",
    steps: [
      { title: "Start the form", body: "Select Add user.", target: { kind: "button", text: "Add user" } },
      { title: "Who is it for?", body: "Enter the Full name and Email.", target: { kind: "label", text: "Full name" }, ifMissing: "Select Add user first." },
      { title: "Role", body: "Choose the Role. It decides which modules the person can open.", target: { kind: "label", text: "Role" }, ifMissing: "Open the Add user form first." },
      { title: "Create", body: "Select Create user. A message shows the temporary password for 30 seconds: pass it to the person safely.", target: { kind: "button", text: "Create user" }, ifMissing: "Open the Add user form first." },
    ],
  },
  {
    id: "mark-attendance",
    articleId: "attendance-mark-students",
    title: "Mark student attendance",
    routeId: "attendance.home",
    steps: [
      { title: "Mark Attendance tab", body: "Stay on the Mark Attendance tab.", target: { kind: "tab", text: "Mark Attendance" } },
      { title: "Pick the section", body: "Choose the Academic year, Class and Section, then the Date.", target: { kind: "label", text: "Date" } },
      { title: "Mark everyone present first", body: "Everyone starts as Present. Change only the students who were absent, late, on half day or on leave.", target: { kind: "button", text: "Mark all present" } },
      { title: "Save", body: "Select Save attendance. \"Attendance saved\" confirms it.", target: { kind: "button", text: "Save attendance" } },
    ],
  },
];

export const toursForArticle = (articleId: string): Tour[] => TOURS.filter((t) => t.articleId === articleId);
export const getTour = (id: string): Tour | undefined => TOURS.find((t) => t.id === id);

/** A tour is only offered where its starting screen opens directly (no record to choose first). */
export const canStartTour = (route: AppRoute | undefined): boolean => !!route && route.deepLink;

// Labels carry a "*" and a screen-reader "(required)" / "(optional)" after the words; those are not part of the name.
const norm = (s: string | null | undefined) =>
  (s ?? "")
    .replace(/\*?\s*\((required|optional)\)/gi, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function shown(el: Element): boolean {
  if (el.closest("[hidden],[aria-hidden='true']")) return false;
  const style = (el.ownerDocument.defaultView ?? window).getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

/** Finds the on-screen control a step points at, or null when it is not there. */
export function findTarget(target: TourTarget, doc: Document = document): HTMLElement | null {
  const want = norm(target.text);
  if (target.kind === "button") {
    const candidates = doc.querySelectorAll<HTMLElement>("button, a[href], [role='button']");
    return [...candidates].find((el) => !el.closest("[data-tour-ignore]") && shown(el) && (norm(el.getAttribute("aria-label")) === want || norm(el.textContent) === want)) ?? null;
  }
  if (target.kind === "tab") {
    return [...doc.querySelectorAll<HTMLElement>("[role='tab']")].find((el) => shown(el) && norm(el.textContent) === want) ?? null;
  }
  // label: the control the label names, falling back to the label itself
  for (const label of doc.querySelectorAll<HTMLLabelElement>("label")) {
    if (norm(label.textContent) !== want || !shown(label)) continue;
    const control = (label.htmlFor ? doc.getElementById(label.htmlFor) : null) ?? label.querySelector<HTMLElement>("input,select,textarea,button");
    return control && shown(control) ? control : label;
  }
  return null;
}
