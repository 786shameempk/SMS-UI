import type { AssessmentComponentInput } from "./types";

/**
 * Starting points only. Nothing here is a rule: choosing one copies its rows into the editor, and the school changes every
 * label and maximum to match its own examination pattern before saving.
 */
export interface AssessmentPreset {
  id: string;
  board: string;
  name: string;
  components: AssessmentComponentInput[];
}

const c = (label: string, max: number, extra: Partial<AssessmentComponentInput> = {}): AssessmentComponentInput => ({
  label,
  max,
  optional: false,
  counts: true,
  showOnCard: true,
  ...extra,
});

export const ASSESSMENT_PRESETS: AssessmentPreset[] = [
  { id: "kerala", board: "Kerala State", name: "Kerala State (starter)", components: [c("Continuous Evaluation", 20), c("Term Evaluation", 80)] },
  { id: "cbse", board: "CBSE", name: "CBSE (starter)", components: [c("PT", 10), c("NBS", 5), c("SEA", 5), c("Half Yearly", 80)] },
  { id: "icse", board: "ICSE", name: "ICSE (starter)", components: [c("Internal Assessment", 20), c("Written Exam", 80)] },
  { id: "pt-nbs-sea", board: "Custom", name: "PT / NBS / SEA / Half Yearly (10-10-10-70)", components: [c("PT", 10), c("NBS", 10), c("SEA", 10), c("Half Yearly", 70)] },
  {
    id: "two-pt",
    board: "Custom",
    name: "Two periodic tests + annual (20-20-5-5-50)",
    components: [c("Periodic Test 1", 20), c("Periodic Test 2", 20), c("Notebook", 5), c("Subject Enrichment", 5), c("Annual Examination", 50)],
  },
  { id: "single", board: "Custom", name: "Single paper (100)", components: [c("Exam", 100)] },
];

export const BOARD_OPTIONS = ["Kerala State", "CBSE", "ICSE", "Other / Custom"];

/** Total of the components that count, rounded to two places so decimal maxima add up cleanly. */
export const componentsTotal = (list: { max: number; counts: boolean }[]): number =>
  Math.round(list.filter((x) => x.counts).reduce((sum, x) => sum + (Number(x.max) || 0), 0) * 100) / 100;

/** The first problem with a component list, or null. Mirrors the server's rules so errors show before saving. */
export function validateComponents(list: AssessmentComponentInput[]): string | null {
  if (list.length === 0) return "Add at least one assessment component.";
  if (list.length > 10) return "Use at most 10 assessment components.";
  const seen = new Set<string>();
  for (const x of list) {
    const label = x.label.trim();
    if (!label || label.length > 30) return "Each component needs a label of up to 30 characters.";
    if (seen.has(label.toLowerCase())) return `The label "${label}" is used twice.`;
    seen.add(label.toLowerCase());
    if (!(Number(x.max) > 0) || Number(x.max) > 1000) return `"${label}" needs a maximum above 0 and up to 1000.`;
  }
  if (!list.some((x) => x.counts)) return "At least one component must count towards the total.";
  return null;
}
