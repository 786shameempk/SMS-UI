import { Link } from "react-router-dom";
import { GraduationCap, Globe, Mail, MessageCircle } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Why EduCore", href: "#why" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Multi-branch campuses", href: "#features" },
      { label: "Multi-tenant isolation", href: "#why" },
      { label: "Security & audit trails", href: "#why" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Demo accounts", href: "/login" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)" }}
              >
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-slate-900">EduCore</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              A connected school management platform — academics to accounting, one campus or many.
            </p>
            <div className="mt-5 flex items-center gap-3 text-slate-400">
              <Mail className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <Globe className="h-4 w-4" />
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-slate-900">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) =>
                  link.href.startsWith("#") ? (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-slate-500 hover:text-slate-900">
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm text-slate-500 hover:text-slate-900">
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row">
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} EduCore. All rights reserved.</p>
          <p className="text-xs text-slate-400">A demo school-management platform.</p>
        </div>
      </div>
    </footer>
  );
}
