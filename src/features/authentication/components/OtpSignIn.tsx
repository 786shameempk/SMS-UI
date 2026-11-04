import { useState } from "react";
import { AlertCircle, ArrowRight, Mail, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";
import type { LoginResult } from "../api";
import { requestOtp, resendOtp, selectOtpAccount, verifyOtp, type OtpAccountChoice, type OtpChallenge, type OtpChannel } from "../otpApi";
import OtpCodeInput, { OTP_LENGTH } from "./OtpCodeInput";
import { formatCountdown, useCountdown } from "./useCountdown";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Roughly a phone number: 8-15 digits once spaces, dashes and a leading + are ignored. The server does the real check. */
function looksLikeMobile(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /^[\d\s\-().+]+$/.test(value);
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive-soft px-3.5 py-3 text-sm text-destructive-strong">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

type Step = "destination" | "code" | "accounts";

/**
 * Sign in with a one-time code sent by email or SMS: type the address or number, type the code, and (only when a number is shared by
 * several accounts) pick the account. The same component serves both channels.
 */
export default function OtpSignIn({ channel, onSignedIn }: { channel: OtpChannel; onSignedIn: (result: LoginResult) => void }) {
  const { t } = useTranslation("authentication");
  const isEmail = channel === "email";
  const [step, setStep] = useState<Step>("destination");
  const [destination, setDestination] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [selection, setSelection] = useState<{ token: string; accounts: OtpAccountChoice[] } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remaining, start } = useCountdown();

  const destinationValid = isEmail ? EMAIL_PATTERN.test(destination.trim()) : looksLikeMobile(destination);

  const guard = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!destinationValid) {
      setError(isEmail ? t("That doesn't look like a valid email") : t("Enter a valid mobile number"));
      return;
    }
    void guard(async () => {
      const issued = await requestOtp(channel, destination);
      setChallenge(issued);
      setCode("");
      start(issued.resendAfterSeconds);
      setStep("code");
    });
  };

  const resend = () =>
    void guard(async () => {
      if (!challenge) return;
      const issued = await resendOtp(challenge.challengeId);
      setChallenge(issued);
      setCode("");
      start(issued.resendAfterSeconds);
    });

  const verify = (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    if (code.length !== OTP_LENGTH) {
      setError(t("Enter the {{count}}-digit code from your message", { count: OTP_LENGTH }));
      return;
    }
    void guard(async () => {
      const result = await verifyOtp(challenge.challengeId, code);
      if (result.kind === "session") {
        onSignedIn(result.session);
        return;
      }
      setSelection({ token: result.selectionToken, accounts: result.accounts });
      setChosen(result.accounts[0]?.userId ?? null);
      setStep("accounts");
    });
  };

  const continueWithAccount = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selection || !chosen) return;
    void guard(async () => onSignedIn(await selectOtpAccount(selection.token, chosen)));
  };

  const changeDestination = () => {
    setStep("destination");
    setChallenge(null);
    setCode("");
    setError(null);
  };

  if (step === "accounts" && selection) {
    return (
      <form onSubmit={continueWithAccount} className="space-y-5" noValidate>
        <FormError message={error} />
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">{t("This number is used by more than one account. Choose the one to sign in to.")}</legend>
          {selection.accounts.map((account) => (
            <label
              key={account.userId}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                chosen === account.userId ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/60",
              )}
            >
              <input
                type="radio"
                name="otp-account"
                value={account.userId}
                checked={chosen === account.userId}
                onChange={() => setChosen(account.userId)}
                disabled={busy}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{account.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {account.roleLabel} &middot; {account.schoolName}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" size="lg" loading={busy} disabled={busy || !chosen} className="h-11 w-full rounded-xl text-[15px]">
          {t("Continue")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    );
  }

  if (step === "code" && challenge) {
    return (
      <form onSubmit={verify} className="space-y-5" noValidate>
        <FormError message={error} />
        <div className="space-y-1.5">
          <Label htmlFor="otp-code">{t("Verification code")}</Label>
          <OtpCodeInput id="otp-code" value={code} onChange={(v) => { setCode(v); setError(null); }} disabled={busy} invalid={Boolean(error)} autoFocus aria-describedby="otp-hint" />
          <p id="otp-hint" className="text-xs text-muted-foreground">
            {isEmail
              ? t("If {{destination}} is registered, we've emailed a {{count}}-digit code to it. It expires in {{minutes}} minutes.", { destination: challenge.maskedDestination, count: OTP_LENGTH, minutes: Math.round(challenge.expiresInSeconds / 60) })
              : t("If {{destination}} is registered, we've sent a {{count}}-digit code to it. It expires in {{minutes}} minutes.", { destination: challenge.maskedDestination, count: OTP_LENGTH, minutes: Math.round(challenge.expiresInSeconds / 60) })}
          </p>
        </div>

        <Button type="submit" size="lg" loading={busy} disabled={busy || code.length !== OTP_LENGTH} className="h-11 w-full rounded-xl text-[15px]">
          {t("Verify and sign in")}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={changeDestination}
            disabled={busy}
            className="rounded font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isEmail ? t("Change email address") : t("Change mobile number")}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={busy || remaining > 0}
            className="rounded font-medium text-primary-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {remaining > 0 ? t("Resend code in {{time}}", { time: formatCountdown(remaining) }) : t("Resend code")}
          </button>
        </div>
      </form>
    );
  }

  const Icon = isEmail ? Mail : Smartphone;
  return (
    <form onSubmit={sendCode} className="space-y-5" noValidate>
      <FormError message={error} />
      <div className="space-y-1.5">
        <Label htmlFor="otp-destination">{isEmail ? t("Email address") : t("Mobile number")}</Label>
        <div className="relative">
          <Icon className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="otp-destination"
            type={isEmail ? "email" : "tel"}
            inputMode={isEmail ? "email" : "tel"}
            autoComplete={isEmail ? "username" : "tel"}
            placeholder={isEmail ? "you@school.edu" : "98765 43210"}
            value={destination}
            onChange={(e) => { setDestination(e.target.value); setError(null); }}
            disabled={busy}
            autoFocus
            dir="ltr"
            className="h-11 rounded-xl ps-10 text-[15px] sm:text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isEmail ? t("We'll email you a code if this address is registered.") : t("We'll text you a code if this number is registered and verified.")}
        </p>
      </div>
      <Button type="submit" size="lg" loading={busy} disabled={busy || !destination.trim()} className="h-11 w-full rounded-xl text-[15px]">
        {t("Send code")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
