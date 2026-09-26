import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "../api";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-page-title">Forgot password</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            We&apos;ll email you a link to reset it
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-7">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
                <MailCheck className="w-5 h-5 text-success-strong" />
              </div>
              <p className="text-sm font-semibold text-foreground">Check your inbox</p>
              <p className="text-xs text-muted-foreground">
                If that email is registered, a reset link is on its way. It may take a few minutes to arrive.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" required>Email</Label>
                <Input id="email" type="email" placeholder="you@school.edu" autoComplete="username" aria-invalid={errors.email ? true : undefined} {...register("email")} />
                {errors.email && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" loading={submitting}>
                Send reset link
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
