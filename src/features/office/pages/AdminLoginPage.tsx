import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthShell from "../components/AuthShell";
import { FormErrorBanner } from "../components/kit";
import { errorText } from "../helpers";
import { PASSWORD_HINT } from "../constants";
import {
  beginMfaSetupFromChallenge,
  changeRequiredPassword,
  confirmMfaSetupFromChallenge,
  officeLogin,
  requestPasswordReset,
  verifyMfa,
} from "../api/auth";
import { useOfficeStore } from "../store";
import type { MfaEnrollment, OfficeAuthResult } from "../types";

type Step = "credentials" | "forgot" | "forgotSent" | "mfa" | "mfaSetup" | "changePassword";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = useOfficeStore((s) => s.status);
  const notice = useOfficeStore((s) => s.notice);
  const restore = useOfficeStore((s) => s.restore);
  const signIn = useOfficeStore((s) => s.signIn);
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Someone who still has a valid office session goes straight in.
  useEffect(() => {
    if (status === "loading") void restore();
  }, [status, restore]);

  if (status === "signedIn") return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/office"} replace />;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  /** Moves to whatever step the server asks for next, or finishes the sign-in. */
  const proceed = async (result: OfficeAuthResult) => {
    setCode("");
    if (result.status === "authenticated") {
      signIn(result);
      navigate("/office", { replace: true });
      return;
    }
    setChallenge(result.challengeToken);
    if (result.status === "mfaRequired") setStep("mfa");
    else if (result.status === "passwordChangeRequired") setStep("changePassword");
    else {
      setEnrollment(await beginMfaSetupFromChallenge(result.challengeToken!));
      setStep("mfaSetup");
    }
  };

  const submitCredentials = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => proceed(await officeLogin(email, password)));
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => proceed(step === "mfa" ? await verifyMfa(challenge!, code) : await confirmMfaSetupFromChallenge(challenge!, code)));
  };

  const submitNewPassword = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) return setError("The two passwords do not match.");
    void run(async () => proceed(await changeRequiredPassword(challenge!, newPassword)));
  };

  const submitForgot = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await requestPasswordReset(email);
      setStep("forgotSent");
    });
  };

  const back = () => {
    setStep("credentials");
    setError(null);
    setPassword("");
    setChallenge(null);
  };

  return (
    <AuthShell
      title={step === "forgot" || step === "forgotSent" ? "Reset your password" : step === "changePassword" ? "Choose a new password" : step === "mfa" || step === "mfaSetup" ? "Two-step verification" : "Sign in"}
      subtitle={step === "credentials" ? "Use your School Sphere office account." : undefined}
    >
      <FormErrorBanner message={error} className="mb-4" />
      {step === "credentials" && notice && !error && <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{notice}</p>}

      {step === "credentials" && (
        <form onSubmit={submitCredentials} className="space-y-4" noValidate>
          <Field id="office-email" label="Email">
            <Input id="office-email" type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field id="office-password" label="Password">
            <Input id="office-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={busy} disabled={!email || !password}>
            <Lock className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Button>
          <button type="button" className="block w-full text-center text-sm text-primary-text hover:underline" onClick={() => { setStep("forgot"); setError(null); }}>
            Forgot your password?
          </button>
        </form>
      )}

      {step === "forgot" && (
        <form onSubmit={submitForgot} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter your office email. If it belongs to an account, we will send a link that works for a short time.</p>
          <Field id="forgot-email" label="Email">
            <Input id="forgot-email" type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={busy} disabled={!email}>
            Send reset link
          </Button>
          <BackLink onClick={back} />
        </form>
      )}

      {step === "forgotSent" && (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p role="status">If that address belongs to an office account, a reset link is on its way. Check your inbox; the link expires soon.</p>
          <BackLink onClick={back} />
        </div>
      )}

      {(step === "mfa" || step === "mfaSetup") && (
        <form onSubmit={submitCode} className="space-y-4">
          {step === "mfaSetup" && enrollment && (
            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
              <p>Your account needs an authenticator app (such as Google Authenticator, Microsoft Authenticator or 1Password).</p>
              <p>
                Add a new account with this key, then enter the 6-digit code it shows:
              </p>
              <p className="break-all rounded bg-card px-2 py-1.5 font-mono text-sm tracking-wider" data-testid="mfa-secret">
                {enrollment.secret}
              </p>
              <a href={enrollment.otpAuthUri} className="text-xs text-primary-text hover:underline">
                Open in your authenticator app
              </a>
            </div>
          )}
          <Field id="mfa-code" label="6-digit code" hint={step === "mfa" ? "From your authenticator app." : undefined}>
            <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} autoFocus required value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={busy} disabled={code.replace(/\s/g, "").length !== 6}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {step === "mfa" ? "Verify" : "Turn on and sign in"}
          </Button>
          <BackLink onClick={back} />
        </form>
      )}

      {step === "changePassword" && (
        <form onSubmit={submitNewPassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">Your password must be changed before you continue.</p>
          <Field id="new-password" label="New password" hint={PASSWORD_HINT}>
            <Input id="new-password" type="password" autoComplete="new-password" autoFocus required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field id="confirm-password" label="Confirm new password">
            <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={busy} disabled={!newPassword || !confirm}>
            Save password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      Back to sign in
    </button>
  );
}

