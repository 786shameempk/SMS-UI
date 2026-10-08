import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { ScrollArrow, useScrollStrip } from "@/components/ui/scroll-strip";
import { findActiveSection, isNavItemActive } from "./navMatch";
import { useVisibleNav } from "./useVisibleNav";

/**
 * The pages of the sidebar section being viewed (Academics, Finance …), as a menu right under the header, the way Talent Showcase
 * does it. The sidebar lists the sections; this lists what is inside the current one. Hidden for pages that belong to no section
 * and for sections with a single page.
 */
export default function SectionSubNav() {
  const { pathname } = useLocation();
  const { sections } = useVisibleNav();
  const { setRef, more, nudge } = useScrollStrip('[aria-current="page"]');
  const section = findActiveSection(sections, pathname);
  if (!section || section.items.length < 2) return null;

  // The most specific matching item is the current page (e.g. /online-exams/my/upcoming over /online-exams/my).
  const current = section.items.filter((i) => isNavItemActive(i, pathname)).sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <div className="shrink-0 border-b border-border bg-card print:hidden">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="relative min-w-0">
          <nav
            ref={setRef}
            aria-label={`${section.title} menu`}
            className="flex gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {section.items.map((item) => {
              const active = item === current;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-text" : "")} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {more.start && <ScrollArrow dir={-1} onClick={() => nudge(-1)} />}
          {more.end && <ScrollArrow dir={1} onClick={() => nudge(1)} />}
        </div>
      </div>
    </div>
  );
}
