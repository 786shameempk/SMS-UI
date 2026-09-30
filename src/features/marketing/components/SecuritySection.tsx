import { motion } from "framer-motion";
import { Check, Fingerprint, Lock, Minus, ScrollText } from "lucide-react";
import { cn } from "@/utils/cn";
import { SECURITY_ITEMS } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

type Access = "full" | "view" | "none";

const MODULES = ["Students", "Fees", "Exams", "Reports"];
const MATRIX: Array<{ role: string; access: Access[] }> = [
  { role: "Administrator", access: ["full", "full", "full", "full"] },
  { role: "Teacher", access: ["view", "none", "full", "view"] },
  { role: "Accountant", access: ["view", "full", "none", "view"] },
  { role: "Parent", access: ["view", "view", "view", "none"] },
];

const AUDIT = [
  { time: "10:42", who: "Priya (Accountant)", what: "Approved fee concession · Invoice #1188" },
  { time: "10:15", who: "Ava (Admin)", what: "Changed role permissions · Teacher" },
  { time: "09:58", who: "Rahul (Teacher)", what: "Updated marks · Grade 9 B, Unit test 2" },
];

function AccessCell({ access }: { access: Access }) {
  if (access === "full")
    return (
      <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  if (access === "view") return <span className="mx-auto flex h-6 items-center justify-center rounded-md bg-sky-50 px-1.5 text-[10px] font-semibold text-sky-700">View</span>;
  return (
    <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-slate-50 text-slate-300">
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

function SecurityVisual() {
  return (
    <div className="relative pb-36 sm:pb-32">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_30px_70px_-30px_rgb(15_23_42/0.3)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Roles &amp; permissions</p>
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            <Lock className="h-3 w-3" /> Enforced on every request
          </span>
        </div>
        <div className="-mx-1 mt-4 overflow-x-auto px-1">
          <table className="w-full min-w-[20rem] text-left">
            <thead>
              <tr>
                <th className="pb-2 text-[11px] font-medium text-slate-400">Role</th>
                {MODULES.map((m) => (
                  <th key={m} className="pb-2 text-center text-[11px] font-medium text-slate-400">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row, r) => (
                <motion.tr
                  key={row.role}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + r * 0.1 }}
                  className="border-t border-slate-100"
                >
                  <td className="py-2 text-xs font-medium text-slate-700">{row.role}</td>
                  {row.access.map((a, i) => (
                    <td key={i} className="py-2">
                      <AccessCell access={a} />
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="absolute bottom-0 left-4 right-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl shadow-slate-900/30 sm:left-auto sm:right-[-1.5rem] sm:w-[22rem]"
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <ScrollText className="h-3.5 w-3.5 text-brand-300" /> Audit log
        </p>
        <ul className="mt-3 space-y-2.5">
          {AUDIT.map((a) => (
            <li key={a.time} className="flex gap-3">
              <span className="text-[10px] font-medium tabular-nums text-slate-500">{a.time}</span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-200">{a.who}</p>
                <p className="truncate text-[11px] text-slate-400">{a.what}</p>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="absolute -top-4 right-6 hidden items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-lg shadow-emerald-900/10 sm:flex"
      >
        <Fingerprint className="h-3.5 w-3.5" /> Sign-in verified with MFA
      </motion.div>
    </div>
  );
}

export default function SecuritySection() {
  return (
    <section id="security" className="scroll-mt-16 border-t border-slate-200/70 bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:px-8">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="Security"
            title="Built for Schools. Designed for Trust."
            description="Student and family records deserve serious protection. Security is part of how School Sphere is built — not an add-on."
          />
          <ul className="mt-10 grid gap-x-6 gap-y-6 sm:grid-cols-2">
            {SECURITY_ITEMS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-700 shadow-sm">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className={cn("lg:pl-4")}>
          <SecurityVisual />
        </Reveal>
      </div>
    </section>
  );
}
