import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Footprints, X } from "lucide-react";
import { getRoute } from "@/app/routeRegistry";
import { Button } from "@/components/ui/button";
import { findTarget, getTour } from "../walkthroughs";
import { useTour } from "../tourStore";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Draws the running walkthrough: a ring around the control the step points at and a small card with the step's words and
 * Back / Next. It only looks at the page and never clicks, types or submits anything for the person; every step is done by them.
 */
export default function WalkthroughHost() {
  const { tourId, step, go, stop } = useTour();
  const { pathname } = useLocation();
  const tour = tourId ? getTour(tourId) : undefined;
  const current = tour?.steps[step];
  const [found, setBox] = useState<Box | null>(null);
  // A step with no target highlights nothing, whatever the last step found.
  const box = current?.target ? found : null;

  // Follow the control: it may appear later (a dialog opening), move, or go away.
  useEffect(() => {
    if (!current?.target) return;
    let scrolled = false;
    const look = () => {
      const el = findTarget(current.target!);
      if (!el) return setBox(null);
      if (!scrolled) {
        el.scrollIntoView?.({ block: "center", behavior: "auto" });
        scrolled = true;
      }
      const r = el.getBoundingClientRect();
      setBox(r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
    };
    look();
    const timer = window.setInterval(look, 300);
    return () => window.clearInterval(timer);
  }, [current, step, pathname]);

  // Escape ends the tour.
  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stop();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, stop]);

  if (!tour || !current) return null;
  const route = getRoute(tour.routeId);
  const lastStep = step === tour.steps.length - 1;
  const lookingFor = current.target && !box;

  // Drawn on <body>, not inside the app shell: dialogs and drawers are portalled to <body>, and from inside the shell this would sit
  // underneath them whatever its z-index.
  return createPortal(
    <div data-unsaved-ignore data-tour-ignore>
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[70] rounded-md ring-4 ring-primary/70 ring-offset-2 ring-offset-background transition-all"
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }}
        />
      )}
      <div role="dialog" aria-label={`Walkthrough: ${tour.title}`} className="pointer-events-auto fixed bottom-4 left-4 z-[71] w-[min(22rem,calc(100vw-2rem))] space-y-2 rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
            {tour.title} · step {step + 1} of {tour.steps.length}
          </p>
          <button type="button" onClick={stop} aria-label="End walkthrough" className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm font-semibold text-foreground">{current.title}</p>
        <p className="text-sm text-muted-foreground">{current.body}</p>
        {lookingFor && current.ifMissing && <p className="rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning-strong">{current.ifMissing}</p>}
        {route && pathname !== route.path && <p className="text-xs text-muted-foreground">This walkthrough is for {route.label}.</p>}
        <div className="flex justify-between gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={() => go(step - 1)} disabled={step === 0}>
            Back
          </Button>
          {lastStep ? (
            <Button type="button" size="sm" onClick={stop}>
              Done
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => go(step + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
