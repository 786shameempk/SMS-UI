import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { changePassword } from "../api";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter the temporary password you were given"),
    newPassword: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

type FormValues = z.infer<typeof schema>;

/**
 * Where an account with a temporary password lands (see routes/ProtectedRoute.tsx): AuthService refuses every other
 * request with 403 password_change_required until the password is changed. The old token still carries that claim,
 * so afterwards the user signs in again with the new password.
 */
export default function ChangePasswordRequiredPage() {
  const navigate = useNavigate();
  const email = useAuthStore((s) => s.user?.email ?? "");
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await changePassword(email, values.currentPassword, values.newPassword);
      clearAuth("signedOut");
      toast.success("Password updated. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            Set a new password
          </CardTitle>
          <CardDescription>
            You signed in with a temporary password{email ? ` (${email})` : ""}. Choose a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Temporary password</Label>
              <Input id="currentPassword" type="password" autoComplete="current-password" aria-invalid={errors.currentPassword ? true : undefined} {...register("currentPassword")} />
              {errors.currentPassword && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.currentPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={errors.newPassword ? true : undefined} {...register("newPassword")} />
              {errors.newPassword && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={errors.confirmPassword ? true : undefined} {...register("confirmPassword")} />
              {errors.confirmPassword && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.confirmPassword.message}</p>}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button type="submit" loading={submitting}>
                Update password
              </Button>
              <Button type="button" variant="ghost" onClick={() => { clearAuth("signedOut"); navigate("/login", { replace: true }); }}>
                Sign out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
