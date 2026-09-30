import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, ChevronDown, Clock, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";
import { SIGN_OUT_REASON_KEY, useAuthStore } from "@/store/authStore";
import { login } from "../api";
import LoginShowcase, { BrandMark } from "../components/LoginShowcase";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address").email("That doesn't look like a valid email"),
  password: z.string().min(1, "Enter your password"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/** Seeded demo accounts (see AuthService seed data) — one click fills the form. */
const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "superadmin@educore.dev", password: "SuperAdmin@123" },
  { role: "Administrator", email: "admin@educore.dev", password: "Admin@12345" },
  { role: "Teacher", email: "teacher@educore.dev", password: "Teacher@123" },
  { role: "Parent", email: "parent@educore.dev", password: "Parent@123" },
];

/** How long the "Signed in" confirmation shows before moving on to the dashboard. */
const SUCCESS_PAUSE_MS = 700;

function readSignOutReason(): string | null {
  try {
    return sessionStorage.getItem(SIGN_OUT_REASON_KEY);
  } catch {
    return null;
  }
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.57 10.57 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          data-slot="field-error"
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1 text-xs text-destructive-strong"
        >
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function CredentialsForm() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const email = watch("email");
  const password = watch("password");
  const busy = status !== "idle";

  useEffect(() => setFocus("email"), [setFocus]);

  // Any edit clears the "wrong password" banner, so it never lingers over a corrected form.
  const clearServerError = () => setServerError(null);

  const onSubmit = async (values: LoginFormValues) => {
    setStatus("submitting");
    setServerError(null);
    try {
      const result = await login({ ...values, email: values.email.trim() });
      setSession(result.user, result.token, result.permissions, values.rememberMe, result.refreshToken);
      setStatus("success");
      toast.success(`Welcome back, ${result.user.name.split(" ")[0]}`);
      // Every sign-in starts on the dashboard (the first nav item), never the page the last session ended on.
      window.setTimeout(() => navigate("/dashboard", { replace: true }), SUCCESS_PAUSE_MS);
    } catch (err) {
      setStatus("idle");
      setServerError(err instanceof Error ? err.message : "We couldn't sign you in. Please try again.");
    }
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    clearServerError();
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
    setFocus("password");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <AnimatePresence initial={false}>
        {serverError && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive-soft px-3.5 py-3 text-sm text-destructive-strong"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{serverError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="email"
            type="email"
            inputMode="email"
            placeholder="you@school.edu"
            autoComplete="username"
            disabled={busy}
            className="h-11 rounded-xl pl-10 text-[15px] sm:text-sm"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email", { onChange: clearServerError })}
          />
        </div>
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={busy}
            className="h-11 rounded-xl pl-10 pr-11 text-[15px] sm:text-sm"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password", { onChange: clearServerError })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer select-none items-center gap-2.5 py-0.5">
          <Checkbox checked={watch("rememberMe")} onCheckedChange={(v) => setValue("rememberMe", v === true)} disabled={busy} />
          <span className="text-sm text-secondary-foreground">Remember me</span>
        </label>
        <Link
          to="/forgot-password"
          className="rounded text-sm font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        size="lg"
        loading={status === "submitting"}
        disabled={busy || !email || !password}
        className={cn(
          "group h-11 w-full rounded-xl text-[15px] transition-colors",
          status === "success" && "bg-success text-success-foreground hover:bg-success disabled:opacity-100",
        )}
      >
        {status === "success" ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.5} /> Signed in — opening your workspace
          </>
        ) : status === "submitting" ? (
          "Signing in…"
        ) : (
          <>
            Sign In
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>

      <div className="relative flex items-center gap-3 py-1" role="separator">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={busy}
        onClick={() => toast("Google sign-in isn't enabled for your school yet.")}
        className="h-11 w-full rounded-xl text-[15px] sm:text-sm"
      >
        <GoogleMark />
        Sign in with Google
      </Button>

      {/* Demo accounts */}
      <div className="rounded-xl border border-dashed border-border">
        <button
          type="button"
          onClick={() => setDemoOpen((v) => !v)}
          aria-expanded={demoOpen}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Exploring the demo? Use a sample account
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", demoOpen && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {demoOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-2 gap-1.5 overflow-hidden px-2.5 pb-2.5"
            >
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => fillDemo(a)}
                    disabled={busy}
                    className="w-full cursor-pointer rounded-lg bg-secondary/60 px-2.5 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
                  >
                    <span className="block text-xs font-semibold text-foreground">{a.role}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{a.email}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const [expired] = useState(() => readSignOutReason() === "expired");

  return (
    <div className="flex min-h-dvh w-full bg-background">
      <LoginShowcase />

      <main className="relative flex flex-1 flex-col">
        {/* Soft backdrop behind the form (phones and tablets get it full-width) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl lg:hidden" />
          <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-300/10 blur-3xl" />
        </div>

        <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[25rem]"
          >
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="lg:hidden">
                <BrandMark />
              </div>
              <h1 className="mt-8 text-[1.75rem] font-bold leading-tight tracking-[-0.025em] text-foreground lg:mt-0">Welcome back!</h1>
              <p className="mt-2 text-[15px] text-muted-foreground">Sign in to continue to your school workspace.</p>
            </div>

            {expired && (
              <div role="status" className="mb-5 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning-strong">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>Your session has expired. Please sign in again to continue where you left off.</p>
              </div>
            )}

            <CredentialsForm />

            <p className="mx-auto mt-8 flex max-w-xs items-start gap-2 text-xs leading-relaxed text-muted-foreground lg:mx-0 lg:max-w-none">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
              <span>
                Secure sign-in. Your school's data stays private to your school and is never shared.
              </span>
            </p>
          </motion.div>
        </div>

        <footer className="relative flex flex-col items-center gap-1.5 px-5 pb-6 text-xs text-muted-foreground sm:flex-row sm:justify-center sm:gap-4 lg:justify-end lg:px-10">
          <Link to="/" className="rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            &larr; Back to website
          </Link>
          <span aria-hidden="true" className="hidden sm:inline">&middot;</span>
          <span>Need help? Contact your school administrator</span>
        </footer>
      </main>
    </div>
  );
}
