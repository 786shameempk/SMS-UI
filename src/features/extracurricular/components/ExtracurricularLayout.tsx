import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { cn } from "@/utils/cn";
import { useExtracurricularAccess } from "../shared";

interface Section {
  to: string;
  label: string;
  end?: boolean;
  /** Shown to staff only. */
  staffOnly?: boolean;
  /** Needs the setup (Manage) action. */
  manage?: boolean;
}

const SECTIONS: Section[] = [
  { to: "/extracurricular", label: "Overview", end: true },
  { to: "/extracurricular/activities", label: "Activities" },
  { to: "/extracurricular/enrollments", label: "Enrollments" },
  { to: "/extracurricular/schedule", label: "Schedule" },
  { to: "/extracurricular/teams", label: "Teams", staffOnly: true },
  { to: "/extracurricular/groups", label: "Houses & groups", staffOnly: true },
  { to: "/extracurricular/events", label: "Events" },
  { to: "/extracurricular/achievements", label: "Achievements" },
  { to: "/extracurricular/sustainability", label: "Sustainability", staffOnly: true },
  { to: "/extracurricular/settings", label: "Settings", staffOnly: true, manage: true },
];

/** The module's frame: a title and a tab bar whose entries depend on who is looking (families see a smaller set). */
export default function ExtracurricularLayout() {
  const access = useExtracurricularAccess();
  const { pathname } = useLocation();
  const sections = SECTIONS.filter((s) => (!s.staffOnly || !access.isFamily) && (!s.manage || access.canManage));
  // A section the signed-in user has no tab for (typed into the address bar, or an old bookmark) goes back to the overview.
  const current = SECTIONS.find((s) => !s.end && (pathname === s.to || pathname.startsWith(`${s.to}/`)));
  if (current && !sections.includes(current)) return <Navigate to="/extracurricular" replace />;

  return (
    <PageContainer>
      <PageHeader
        title="Extra-Curricular"
        description={
          access.isFamily
            ? "Browse activities, ask to join, and follow your child's sessions, events and achievements."
            : "Activities, houses and teams, schedules and attendance, events, achievements and green campus programs."
        }
      />
      <nav aria-label="Extra-Curricular sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        {sections.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              cn(
                "relative shrink-0 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "text-primary after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </PageContainer>
  );
}
