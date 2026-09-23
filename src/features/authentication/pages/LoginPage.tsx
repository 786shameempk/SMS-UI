import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/store/authStore";
import { login } from "../api";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function CredentialsForm() {
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
      const result = await login(values);
      setSession(result.user, result.token, result.permissions, values.rememberMe);
      toast.success(`Welcome back, ${result.user.name.split(" ")[0]}`);
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

export default function LoginPage() {
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

        <CredentialsForm />

        <p className="text-center text-xs text-slate-400 mt-5">
          Demo accounts: superadmin@educore.dev / SuperAdmin@123 &middot; admin@educore.dev / Admin@12345 &middot;
          teacher@educore.dev / Teacher@123 &middot; parent@educore.dev / Parent@123
        </p>
      </div>
    </div>
  );
}
