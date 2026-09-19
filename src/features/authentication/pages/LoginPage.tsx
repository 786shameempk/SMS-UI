import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/store/authStore";
import { login, verifyMfaCode } from "../api";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function CredentialsForm({ onMfaRequired }: { onMfaRequired: (email: string, rememberMe: boolean) => void }) {
  const navigate = useNavigate();
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
      const outcome = await login(values);
      if (outcome.status === "mfa_required") {
        onMfaRequired(outcome.email, Boolean(values.rememberMe));
        return;
      }
      setSession(outcome.user, outcome.token, outcome.permissions, values.rememberMe);
      toast.success(`Welcome back, ${outcome.user.name.split(" ")[0]}`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@school.edu" autoComplete="username" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
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
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox checked={watch("rememberMe")} onCheckedChange={(v) => setValue("rememberMe", v === true)} />
        <span className="text-sm text-slate-600">Remember me</span>
      </label>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Sign in
      </Button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-slate-400">or continue with</span>
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

function MfaForm({ email, rememberMe, onBack }: { email: string; rememberMe: boolean; onBack: () => void }) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await verifyMfaCode(email, code);
      setSession(result.user, result.token, result.permissions, rememberMe);
      toast.success(`Welcome back, ${result.user.name.split(" ")[0]}`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col items-center text-center gap-2 pb-1">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
        </div>
        <p className="text-sm font-semibold text-slate-800">Two-factor verification</p>
        <p className="text-xs text-slate-500">
          Enter the 6-digit code sent to <span className="font-medium text-slate-700">{email}</span>
        </p>
      </div>

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="123456"
        inputMode="numeric"
        className="text-center tracking-[0.5em] text-lg font-semibold"
        maxLength={6}
        autoFocus
      />
      <p className="text-[11px] text-slate-400 text-center">Demo code: 123456</p>

      <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Verify &amp; sign in
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [mfa, setMfa] = useState<{ email: string; rememberMe: boolean } | null>(null);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-sm"
            style={{ background: "linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)" }}
          >
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">EduCore</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your school management account</p>
        </div>

        {mfa ? (
          <MfaForm email={mfa.email} rememberMe={mfa.rememberMe} onBack={() => setMfa(null)} />
        ) : (
          <CredentialsForm onMfaRequired={(email, rememberMe) => setMfa({ email, rememberMe })} />
        )}

        <p className="text-center text-xs text-slate-400 mt-5">
          Demo accounts: superadmin@educore.dev / superadmin123 (MFA code 123456) &middot; admin@educore.dev / admin123 (MFA
          code 123456) &middot; teacher@educore.dev / teacher123 &middot; parent@educore.dev / parent123
        </p>
      </div>
    </div>
  );
}
