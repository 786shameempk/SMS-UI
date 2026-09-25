import { motion } from "framer-motion";
import { Check, Globe2, Info, Lock, School } from "lucide-react";
import { cn } from "@/utils/cn";
import { CATEGORY_CONFIG, CATEGORY_ORDER, VISIBILITY_CONFIG } from "../constants";
import type { TalentCategory, TalentVisibility } from "../types";

export function CategoryPicker({ value, onChange }: { value: TalentCategory; onChange: (c: TalentCategory) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Talent category">
      {CATEGORY_ORDER.map((c) => {
        const config = CATEGORY_CONFIG[c];
        const active = value === c;
        return (
          <motion.button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(c)}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-3 text-left transition-all cursor-pointer",
              active ? "border-transparent text-white shadow-lg shadow-violet-900/20" : "border-border bg-card hover:border-violet-300 hover:-translate-y-0.5",
            )}
          >
            {active && <span className={cn("absolute inset-0 bg-gradient-to-br", config.gradient)} />}
            <span className="relative flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {config.emoji}
              </span>
              <span className={cn("text-sm font-medium leading-tight", active ? "text-white" : "text-foreground")}>{config.label}</span>
            </span>
            {active && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Visibility is chosen here but only takes effect after approval - the picker says so explicitly, and a
 * school's policy can lock Public (the backend enforces the same rule).
 */
export function VisibilityPicker({ value, onChange, publicAllowed = true }: { value: TalentVisibility; onChange: (v: TalentVisibility) => void; publicAllowed?: boolean }) {
  const options: Array<{ value: TalentVisibility; icon: typeof School; gradient: string; who: string[] }> = [
    { value: "school_only", icon: School, gradient: "from-indigo-600 to-violet-600", who: ["Students & teachers at your school", "Parents at your school"] },
    { value: "public", icon: Globe2, gradient: "from-sky-500 to-teal-500", who: ["Everyone at your school", "Students, teachers & parents at other schools"] },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-3" role="radiogroup" aria-label="Who can see this">
        {options.map((o) => {
          const config = VISIBILITY_CONFIG[o.value];
          const active = value === o.value;
          const locked = o.value === "public" && !publicAllowed;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={locked}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative text-left rounded-2xl border-2 p-4 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-55",
                active ? "border-violet-500 bg-violet-500/[0.06] shadow-lg shadow-violet-900/10" : "border-border bg-card hover:border-violet-300",
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn("w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-md", o.gradient)}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    {config.emoji} {config.label}
                    {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{locked ? "Your school has turned off public sharing for this content." : config.description}</p>
                </div>
                <span className={cn("w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center", active ? "border-violet-500 bg-violet-500" : "border-border")}>
                  {active && <Check className="w-3 h-3 text-white" />}
                </span>
              </div>
              <ul className="mt-3 space-y-1 pl-1 sm:pl-14">
                {o.who.map((w) => (
                  <li key={w} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500" />
                    {w}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong className="font-semibold">Nothing is visible yet.</strong> Your showcase stays private until a teacher or school admin approves it - then it appears for the audience you choose here.
        </span>
      </p>
    </div>
  );
}
