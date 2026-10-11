import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

/** The shell shared by every office sign-in screen. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-white">
          <ShieldCheck className="h-7 w-7 text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold leading-tight">School Sphere</p>
            <p className="text-xs uppercase tracking-widest text-white/60">Office portal</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card p-6 shadow-2xl sm:p-8">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-white/50">For School Sphere team members only. Activity on this portal is monitored and recorded.</p>
      </div>
    </div>
  );
}
