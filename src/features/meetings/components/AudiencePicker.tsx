import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, GraduationCap, Search, UserRound, UsersRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { searchDirectory } from "../api";
import type { AudienceRule, AudienceType, DirectoryPerson, MeetingType } from "../types";
import { audienceKey } from "../utils";

export interface PickedAudience extends AudienceRule {
  key: string;
  label: string;
}

interface QuickOption {
  type: AudienceType;
  label: string;
  hint: string;
  needsSection?: boolean;
}

/** The one-tap choices shown for each kind of meeting - most schedules never need the search box. */
function quickOptions(meetingType: MeetingType): QuickOption[] {
  switch (meetingType) {
    case "OnlineClass":
    case "Examination":
      return [
        { type: "Section", label: "Whole class", hint: "Every student in the class", needsSection: true },
        { type: "SectionGuardians", label: "Parents too", hint: "Their parents can join", needsSection: true },
      ];
    case "ParentTeacherMeeting":
      return [{ type: "SectionGuardians", label: "All parents of the class", hint: "Every parent with a login", needsSection: true }];
    case "TeacherMeeting":
      return [{ type: "AllTeachers", label: "All teachers", hint: "Every teacher with a login" }];
    case "StaffMeeting":
    case "TrainingSession":
      return [
        { type: "AllStaff", label: "All staff", hint: "Teaching and non-teaching" },
        { type: "AllTeachers", label: "Teachers only", hint: "Every teacher with a login" },
      ];
    case "PrincipalMeeting":
    case "ManagementMeeting":
      return [
        { type: "Management", label: "Management", hint: "Principal and vice principal" },
        { type: "AllTeachers", label: "All teachers", hint: "Every teacher with a login" },
      ];
    default:
      return [{ type: "AllStaff", label: "All staff", hint: "Teaching and non-teaching" }];
  }
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** A directory hit becomes a rule, so names always come from AcademicService, never from this form. */
function ruleFor(person: DirectoryPerson): PickedAudience {
  if (person.personType === "Student") {
    return { key: audienceKey("Student", person.personId), type: "Student", targetId: person.personId, label: person.displayName };
  }
  if (person.personType === "Guardian") {
    const child = person.detail?.replace(/^Parent of /, "") ?? "a student";
    return { key: audienceKey("StudentGuardians", person.studentId), type: "StudentGuardians", targetId: person.studentId, label: `Parents of ${child}` };
  }
  return { key: audienceKey("Staff", person.personId), type: "Staff", targetId: person.personId, label: person.displayName };
}

const PERSON_ICON = { Student: GraduationCap, Guardian: UsersRound, Staff: UserRound } as const;

interface AudiencePickerProps {
  meetingType: MeetingType;
  sectionId: string | null;
  sectionLabel: string | null;
  value: PickedAudience[];
  onChange: (value: PickedAudience[]) => void;
}

export default function AudiencePicker({ meetingType, sectionId, sectionLabel, value, onChange }: AudiencePickerProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search.trim(), 250);
  const selected = new Set(value.map((v) => v.key));

  const { data: results = [], isFetching, isError } = useQuery({
    queryKey: ["meetings", "directory", debounced],
    queryFn: () => searchDirectory(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  const toggle = (item: PickedAudience) =>
    onChange(selected.has(item.key) ? value.filter((v) => v.key !== item.key) : [...value, item]);

  const options = quickOptions(meetingType);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const disabled = option.needsSection && !sectionId;
          const item: PickedAudience = {
            key: audienceKey(option.type, option.needsSection ? sectionId : null),
            type: option.type,
            targetId: option.needsSection ? sectionId : null,
            label: option.needsSection && sectionLabel ? `${option.label} · ${sectionLabel}` : option.label,
          };
          const on = selected.has(item.key);
          return (
            <button
              key={option.type}
              type="button"
              disabled={disabled}
              onClick={() => toggle(item)}
              title={disabled ? "Pick a class first" : option.hint}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                on ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-secondary-foreground hover:bg-secondary",
              )}
            >
              {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id="meeting-people-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Add a student, parent or staff member…"
          className="pl-9"
          autoComplete="off"
        />
        {debounced.length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
            {isFetching && <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>}
            {isError && <p className="px-3 py-2 text-sm text-red-600">The school directory isn't available right now.</p>}
            {!isFetching && !isError && results.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No one with a login matches “{debounced}”.</p>
            )}
            {results.map((person) => {
              const rule = ruleFor(person);
              const Icon = PERSON_ICON[person.personType];
              const on = selected.has(rule.key);
              return (
                <button
                  key={`${person.personType}-${person.personId}`}
                  type="button"
                  onClick={() => {
                    toggle(rule);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary cursor-pointer"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{person.displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{person.detail}</span>
                  </span>
                  {on && <Check className="h-4 w-4 text-primary" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Invited">
          {value.map((v) => (
            <li key={v.key} className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-1 pl-3 pr-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
              {v.label}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.key !== v.key))}
                className="rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-800 cursor-pointer"
                aria-label={`Remove ${v.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
