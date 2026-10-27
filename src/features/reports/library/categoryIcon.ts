import {
  AlertTriangle, BookOpen, Boxes, Briefcase, Building2, Bus, CalendarCheck, ClipboardList, FileText, GraduationCap, MessageSquare, Trophy, UserPlus, Users, Video, Wallet, type LucideIcon,
} from "lucide-react";

/** The icon for a report category, by the start of its key ("students", "fees", "comms"...). Anything unknown gets a plain document. */
const BY_PREFIX: [string, LucideIcon][] = [
  ["student", GraduationCap], ["attendance", CalendarCheck], ["staff", Briefcase], ["teacher", Briefcase], ["exam", ClipboardList], ["admission", UserPlus],
  ["fee", Wallet], ["payroll", Wallet], ["transport", Bus], ["hostel", Building2], ["library", BookOpen], ["inventory", Boxes], ["comm", MessageSquare],
  ["meeting", Video], ["extracurricular", Trophy], ["branch", Building2], ["risk", AlertTriangle], ["parent", Users], ["homework", ClipboardList],
  ["academic", GraduationCap], ["timetable", CalendarCheck], ["admin", Briefcase],
];

export function categoryIcon(key: string): LucideIcon {
  const k = key.toLowerCase();
  return BY_PREFIX.find(([prefix]) => k.startsWith(prefix))?.[1] ?? FileText;
}
