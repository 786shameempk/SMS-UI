import { motion } from "framer-motion";
import { BookOpen, CalendarCheck, GraduationCap, Presentation, ShieldCheck, UserRound, UsersRound, Video } from "lucide-react";

/**
 * Left half of the sign-in screen: brand, tagline, and an illustration of the "sphere" — the school at the
 * centre with administrators, teachers, students, and parents on the orbits around it.
 */

const ROLES = [
  { icon: ShieldCheck, label: "Admin", x: "50%", y: "4%" },
  { icon: Presentation, label: "Teacher", x: "95%", y: "50%" },
  { icon: GraduationCap, label: "Student", x: "50%", y: "96%" },
  { icon: UsersRound, label: "Parent", x: "5%", y: "50%" },
];

function Sphere() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
      {/* Orbits */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="sphere-core" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="45%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
          <linearGradient id="orbit-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="184" fill="none" stroke="url(#orbit-stroke)" strokeWidth="1" />
        <circle cx="200" cy="200" r="130" fill="none" stroke="#a5b4fc" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="2 6" />
        <motion.g
          style={{ transformOrigin: "200px 200px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <ellipse cx="200" cy="200" rx="160" ry="62" fill="none" stroke="#a5b4fc" strokeOpacity="0.18" transform="rotate(-24 200 200)" />
          <circle cx="352" cy="148" r="3" fill="#c7d2fe" />
        </motion.g>
        <motion.g
          style={{ transformOrigin: "200px 200px" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        >
          <ellipse cx="200" cy="200" rx="160" ry="62" fill="none" stroke="#a5b4fc" strokeOpacity="0.14" transform="rotate(32 200 200)" />
          <circle cx="66" cy="115" r="2.5" fill="var(--color-brand-300)" />
        </motion.g>

        {/* Core */}
        <circle cx="200" cy="200" r="66" fill="url(#sphere-core)" />
        <circle cx="200" cy="200" r="66" fill="none" stroke="#c7d2fe" strokeOpacity="0.35" />
        <ellipse cx="200" cy="200" rx="66" ry="22" fill="none" stroke="#c7d2fe" strokeOpacity="0.2" />
        <ellipse cx="200" cy="200" rx="24" ry="66" fill="none" stroke="#c7d2fe" strokeOpacity="0.15" />
      </svg>

      {/* Emblem */}
      <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur-sm">
        <GraduationCap className="h-7 w-7 text-white" strokeWidth={1.7} />
      </div>

      {/* Role nodes */}
      {ROLES.map((role, i) => (
        <motion.div
          key={role.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: "easeOut" }}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
          style={{ left: role.x, top: role.y }}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-indigo-950/80 text-indigo-100 shadow-lg shadow-black/30 backdrop-blur">
            <role.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-indigo-100/90">{role.label}</span>
        </motion.div>
      ))}

      {/* Floating glass cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: [0, -6, 0] }}
        transition={{ opacity: { delay: 0.9, duration: 0.4 }, y: { delay: 1.3, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -right-6 top-[14%] flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 shadow-xl shadow-black/20 backdrop-blur-md xl:-right-12"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
          <CalendarCheck className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[10px] text-indigo-200/80">Attendance today</p>
          <p className="text-xs font-semibold text-white">96% present</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 1.1, duration: 0.4 }, y: { delay: 1.5, duration: 5.5, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -left-8 bottom-[14%] flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 shadow-xl shadow-black/20 backdrop-blur-md xl:-left-14"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-400/15 text-brand-300">
          <Video className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[10px] text-indigo-200/80">Physics · Grade 10 A</p>
          <p className="text-xs font-semibold text-white">Class starts in 10 min</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: [0, -5, 0] }}
        transition={{ opacity: { delay: 1.3, duration: 0.4 }, y: { delay: 1.7, duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -left-4 top-[18%] hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 shadow-xl shadow-black/20 backdrop-blur-md xl:flex"
      >
        <BookOpen className="h-3.5 w-3.5 text-teal-300" />
        <p className="text-xs font-medium text-white">New study material</p>
      </motion.div>
    </div>
  );
}

export function BrandMark({ inverted }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-[11px] shadow-sm shadow-brand-700/30 ring-1 ring-inset ring-white/20">
        <GraduationCap className="h-[18px] w-[18px] text-white" aria-hidden="true" />
      </div>
      <span className={`text-lg font-bold tracking-[-0.02em] ${inverted ? "text-white" : "text-foreground"}`}>School Sphere</span>
    </div>
  );
}

export default function LoginShowcase() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-[#0b0f2a] lg:flex lg:w-[46%] lg:flex-col xl:w-1/2">
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_20%,#312e81_0%,transparent_60%)]" />
        <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 50% 45%, black 10%, transparent 70%)",
          }}
        />
      </div>

      <div className="flex flex-1 flex-col px-12 py-10 xl:px-16">
        <BrandMark inverted />

        <div className="flex flex-1 flex-col justify-center py-10">
          <Sphere />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-14 max-w-md text-center"
          >
            <h2 className="text-3xl font-bold leading-tight tracking-[-0.03em] text-white xl:text-[2.1rem]">
              Simplifying School.
              <br />
              <span className="bg-gradient-to-r from-indigo-200 via-white to-teal-200 bg-clip-text text-transparent">Connecting Everyone.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-indigo-100/70">
              Administrators, teachers, students, and parents — together in one secure school workspace.
            </p>
          </motion.div>
        </div>

        <div className="flex items-center justify-between text-xs text-indigo-200/60">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" /> One login for every role
          </span>
          <span>&copy; {new Date().getFullYear()} School Sphere</span>
        </div>
      </div>
    </aside>
  );
}
