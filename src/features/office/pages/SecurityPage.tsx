import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { FormErrorBanner } from "../components/kit";
import { errorText } from "../helpers";
import { beginMfaEnrollment, changeOwnPassword, confirmMfaEnrollment, disableMfa, getMe, logoutEverywhere } from "../api/auth";
import { PASSWORD_HINT } from "../constants";
import { useOfficeStore } from "../store";
import type { MfaEnrollment } from "../types";

/** The signed-in person's own security: password, two-step verification and signing out everywhere. */
export default function SecurityPage() {
  const user = useOfficeStore((s) => s.user)!;
  const setUser = useOfficeStore((s) => s.setUser);
  const clear = useOfficeStore((s) => s.clear);
  const navigate = useNavigate();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const refreshProfile = async () => setUser(await getMe());

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setPwError("The two passwords do not match.");
    setPwBusy(true);
    setPwError(null);
    try {
      await changeOwnPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed. Your other sessions were signed out.");
    } catch (err) {
      setPwError(errorText(err));
    } finally {
      setPwBusy(false);
    }
  };

  const guard = async (action: () => Promise<void>) => {
    setMfaBusy(true);
    setMfaError(null);
    try {
      await action();
    } catch (err) {
      setMfaError(errorText(err));
    } finally {
      setMfaBusy(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader icon={ShieldCheck} title="My security" description="Your password, two-step verification and sessions." />

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Two-step verification</h2>
            <p className="text-sm text-muted-foreground">A code from an authenticator app is asked for after your password.</p>
          </div>
          <Badge variant={user.mfaEnabled ? "success" : "warning"}>{user.mfaEnabled ? "On" : "Off"}</Badge>
        </div>
        <FormErrorBanner message={mfaError} />

        {!user.mfaEnabled && !enrollment && (
          <Button onClick={() => void guard(async () => setEnrollment(await beginMfaEnrollment()))} loading={mfaBusy}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Set up two-step verification
          </Button>
        )}

        {!user.mfaEnabled && enrollment && (
          <form
            className="max-w-md space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void guard(async () => {
                await confirmMfaEnrollment(code);
                setEnrollment(null);
                setCode("");
                await refreshProfile();
                toast.success("Two-step verification is on.");
              });
            }}
          >
            <p className="text-sm">Add a new account in your authenticator app using this key, then enter the code it shows.</p>
            <p className="break-all rounded bg-muted px-2 py-1.5 font-mono text-sm tracking-wider" data-testid="mfa-secret">
              {enrollment.secret}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-code">6-digit code</Label>
              <Input id="enroll-code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={mfaBusy} disabled={code.replace(/\s/g, "").length !== 6}>
                Turn on
              </Button>
              <Button type="button" variant="outline" onClick={() => setEnrollment(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {user.mfaEnabled && (
          <form
            className="max-w-md space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void guard(async () => {
                await disableMfa(disablePassword, code);
                setDisablePassword("");
                setCode("");
                await refreshProfile();
                toast.success("Two-step verification is off.");
              });
            }}
          >
            <p className="text-sm text-muted-foreground">To turn it off, confirm with your password and a current code.</p>
            <div className="space-y-1.5">
              <Label htmlFor="disable-password">Password</Label>
              <Input id="disable-password" type="password" autoComplete="current-password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disable-code">Current code</Label>
              <Input id="disable-code" inputMode="numeric" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <Button type="submit" variant="outline" loading={mfaBusy} disabled={!disablePassword || code.replace(/\s/g, "").length !== 6}>
              Turn off
            </Button>
          </form>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Change password</h2>
        <form onSubmit={submitPassword} className="mt-3 max-w-md space-y-3">
          <FormErrorBanner message={pwError} />
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next-password">New password</Label>
            <Input id="next-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-next-password">Confirm new password</Label>
            <Input id="confirm-next-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" loading={pwBusy} disabled={!current || !next || !confirm}>
            Change password
          </Button>
        </form>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Sign out everywhere</h2>
          <p className="text-sm text-muted-foreground">Ends this session and every other one on any device.</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await logoutEverywhere();
            clear();
            navigate("/adminLogin", { replace: true });
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out everywhere
        </Button>
      </Card>
    </PageContainer>
  );
}
