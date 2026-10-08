import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, CircleHelp, GraduationCap, LifeBuoy, ListChecks, Menu, ShieldCheck, Workflow, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { appHref } from "@/lib/appUrl";
import { useLeadCapture } from "./LeadCapture";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "AI", href: "#ai" },
  { label: "Solutions", href: "#solutions" },
  { label: "Mobile Apps", href: "#mobile-apps" },
  { label: "Plans", href: "#plans" },
];

interface ResourceLink {
  icon: LucideIcon;
  label: string;
  description: string;
  href?: string;
  action?: "contact";
}

const RESOURCES: ResourceLink[] = [
  { icon: ListChecks, label: "How it works", description: "From sign-up to go-live in a few steps", href: "#how-it-works" },
  { icon: CircleHelp, label: "FAQ", description: "Answers to common questions", href: "#faq" },
  { icon: ShieldCheck, label: "Security", description: "How we protect your school's data", href: "#security" },
  { icon: Workflow, label: "AI insights", description: "Trends and students who may need attention", href: "#insights" },
  { icon: LifeBuoy, label: "Help & support", description: "Talk to our team", action: "contact" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <div className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-[10px] shadow-sm shadow-brand-700/30 ring-1 ring-inset ring-white/20">
        <GraduationCap className="h-4 w-4 text-white" />
      </div>
      <span className="text-[17px] font-bold tracking-[-0.02em] text-slate-900">School Sphere</span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const { openDemo, openContact } = useLeadCapture();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!resourcesOpen) return;
    const close = (e: MouseEvent) => {
      if (!resourcesRef.current?.contains(e.target as Node)) setResourcesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setResourcesOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [resourcesOpen]);

  const runResource = (r: ResourceLink) => {
    setResourcesOpen(false);
    setOpen(false);
    if (r.action === "contact") openContact();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled ? "border-slate-200/70 bg-white/90 shadow-[0_1px_12px_rgb(15_23_42/0.04)] backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 xl:px-3 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-900">
              {link.label}
            </a>
          ))}
          <div ref={resourcesRef} className="relative">
            <button
              type="button"
              onClick={() => setResourcesOpen((v) => !v)}
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-900"
            >
              Resources
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", resourcesOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {resourcesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full mt-2 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
                >
                  {RESOURCES.map((r) => {
                    const body = (
                      <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-brand-700 transition-colors group-hover:border-brand-200 group-hover:bg-brand-50">
                          <r.icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">{r.label}</span>
                          <span className="block text-xs text-slate-500">{r.description}</span>
                        </span>
                      </>
                    );
                    const cls = "group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-slate-50";
                    return r.href ? (
                      <a key={r.label} href={r.href} onClick={() => runResource(r)} className={cls}>
                        {body}
                      </a>
                    ) : (
                      <button key={r.label} type="button" onClick={() => runResource(r)} className={cls}>
                        {body}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" asChild>
            <a href={appHref("/login")}>Sign In</a>
          </Button>
          <Button onClick={openDemo} className="group">
            Get Started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
          >
            <div className="flex flex-col gap-0.5 px-4 py-4 sm:px-6">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-medium text-slate-800 hover:bg-slate-50">
                  {link.label}
                </a>
              ))}
              <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Resources</p>
              {RESOURCES.map((r) =>
                r.href ? (
                  <a key={r.label} href={r.href} onClick={() => runResource(r)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <r.icon className="h-4 w-4 text-brand-700" /> {r.label}
                  </a>
                ) : (
                  <button key={r.label} type="button" onClick={() => runResource(r)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <r.icon className="h-4 w-4 text-brand-700" /> {r.label}
                  </button>
                ),
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" size="lg" asChild>
                  <a href={appHref("/login")}>Sign In</a>
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setOpen(false);
                    openDemo();
                  }}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
