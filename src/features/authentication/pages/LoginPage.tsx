import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Eye, EyeOff, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SIGN_OUT_REASON_KEY, useAuthStore } from "@/store/authStore";
import { login } from "../api";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/** Where to go after signing in: back to the page the session ended on, never off-site or to /login itself. */
function useReturnPath(): string {
  const from = (useLocation().state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/login") ? from : "/dashboard";
}

function readSignOutReason(): string | null {
  try {
    return sessionStorage.getItem(SIGN_OUT_REASON_KEY);
  } catch {
    return null;
  }
}

function CredentialsForm() {
  const navigate = useNavigate();
  const returnPath = useReturnPath();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const result = await login(values);
      setSession(result.user, result.token, result.permissions, values.rememberMe, result.refreshToken);
      toast.success(`Welcome back, ${result.user.name.split(" ")[0]}`);
      navigate(returnPath, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-7">
      <div className="space-y-1.5">
        <Label htmlFor="email" required>Email</Label>
        <Input id="email" type="email" placeholder="you@school.edu" autoComplete="username" aria-invalid={errors.email ? true : undefined} {...register("email")} />
        {errors.email && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" required>Password</Label>
          <Link to="/forgot-password" className="text-xs font-medium text-primary-text hover:underline underline-offset-4">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            className="pr-10"
            aria-invalid={errors.password ? true : undefined} {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.password.message}</p>}
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox checked={watch("rememberMe")} onCheckedChange={(v) => setValue("rememberMe", v === true)} />
        <span className="text-sm text-secondary-foreground">Remember me</span>
      </label>

      <Button type="submit" className="w-full" loading={submitting}>
        Sign in
      </Button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={() => toast("Google SSO is not configured yet")}>
          Google
        </Button>
        <Button type="button" variant="outline" onClick={() => toast("Microsoft SSO is not configured yet")}>
          Microsoft
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const [expired] = useState(() => readSignOutReason() === "expired");
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-page-title">EduCore</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your school management account</p>
        </div>

        {expired && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm text-warning-strong"
          >
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Your session has expired. Please sign in again to continue where you left off.</p>
          </div>
        )}

        <CredentialsForm />

        <p className="text-center text-xs text-muted-foreground mt-5">
          Demo accounts: superadmin@educore.dev / SuperAdmin@123 &middot; admin@educore.dev / Admin@12345 &middot;
          teacher@educore.dev / Teacher@123 &middot; parent@educore.dev / Parent@123
        </p>
      </div>
    </div>
  );
}
