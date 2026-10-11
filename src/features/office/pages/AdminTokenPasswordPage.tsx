import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormErrorBanner } from "../components/kit";
import { errorText } from "../helpers";
import { acceptInvite, resetPassword } from "../api/auth";
import AuthShell from "../components/AuthShell";
import { PASSWORD_HINT } from "../constants";

/** The page an emailed link opens: "reset" (forgot password) or "invite" (first password for a new team member). */
export default function AdminTokenPasswordPage({ mode }: { mode: "reset" | "invite" }) {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const title = mode === "invite" ? "Welcome to the School Sphere team" : "Choose a new password";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    setError(null);
    try {
      await (mode === "invite" ? acceptInvite : resetPassword)(token, password);
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="This link is not valid">
        <p className="text-sm text-muted-foreground">The link is incomplete. Open it again from your email, or ask for a new one.</p>
        <Link to="/adminLogin" className="mt-4 inline-block text-sm text-primary-text hover:underline">
          Go to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={done ? "All set" : title} subtitle={done ? undefined : mode === "invite" ? "Set a password to activate your office account." : undefined}>
      {done ? (
        <div className="space-y-4 text-sm">
          <p role="status" className="text-muted-foreground">
            {mode === "invite" ? "Your account is ready." : "Your password has been changed and your other sessions were signed out."}
          </p>
          <Button asChild className="w-full">
            <Link to="/adminLogin">Sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <FormErrorBanner message={error} />
          <div className="space-y-1.5">
            <Label htmlFor="token-password">New password</Label>
            <Input id="token-password" type="password" autoComplete="new-password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token-confirm">Confirm new password</Label>
            <Input id="token-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" loading={busy} disabled={!password || !confirm}>
            {mode === "invite" ? "Activate account" : "Change password"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
