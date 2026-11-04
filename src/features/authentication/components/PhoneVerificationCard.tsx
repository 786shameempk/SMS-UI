import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPhoneStatus, requestPhoneVerification, verifyPhone, type OtpChallenge } from "../otpApi";
import OtpCodeInput, { OTP_LENGTH } from "./OtpCodeInput";
import { formatCountdown, useCountdown } from "./useCountdown";

/**
 * Proving ownership of a mobile number is what lets someone sign in with an SMS code, so it lives next to the password settings.
 * Hidden entirely while the server has sign-in with a code switched off.
 */
export default function PhoneVerificationCard() {
  const { t } = useTranslation("authentication");
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["auth", "phone"], queryFn: getPhoneStatus, retry: false });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { remaining, start } = useCountdown();

  const send = useMutation({
    mutationFn: () => requestPhoneVerification(phone),
    onSuccess: (issued) => {
      setChallenge(issued);
      setCode("");
      setError(null);
      start(issued.resendAfterSeconds);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t("We couldn't send a code. Please try again.")),
  });

  const verify = useMutation({
    mutationFn: () => verifyPhone(challenge!.challengeId, code),
    onSuccess: () => {
      toast.success(t("Mobile number verified"));
      setChallenge(null);
      setPhone("");
      setCode("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["auth", "phone"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : t("We couldn't check that code. Please try again.")),
  });

  if (!status?.otpEnabled) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{t("Mobile number")}</CardTitle>
          {status.confirmed ? <Badge variant="success">{t("Verified")}</Badge> : <Badge variant="warning">{t("Not verified")}</Badge>}
        </div>
        <CardDescription>
          {status.maskedPhone
            ? t("Number on file: {{phone}}. Verify a number to sign in with a code sent by SMS.", { phone: status.maskedPhone })
            : t("Add and verify your mobile number to sign in with a code sent by SMS.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {challenge ? (
          <form
            className="max-w-sm space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === OTP_LENGTH) verify.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="phone-code">{t("Verification code")}</Label>
              <OtpCodeInput id="phone-code" value={code} onChange={(v) => { setCode(v); setError(null); }} invalid={Boolean(error)} autoFocus aria-describedby="phone-hint" />
              <p id="phone-hint" className="text-xs text-muted-foreground">
                {t("We sent a {{count}}-digit code to {{destination}}.", { count: OTP_LENGTH, destination: challenge.maskedDestination })}
              </p>
              {error && <p role="alert" data-slot="field-error" className="text-xs text-destructive-strong">{error}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={verify.isPending} disabled={code.length !== OTP_LENGTH}>
                {t("Verify number")}
              </Button>
              <Button type="button" variant="outline" disabled={remaining > 0 || send.isPending} onClick={() => send.mutate()}>
                {remaining > 0 ? t("Resend code in {{time}}", { time: formatCountdown(remaining) }) : t("Resend code")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setChallenge(null); setError(null); }}>
                {t("Change number")}
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="max-w-sm space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (phone.replace(/\D/g, "").length >= 8) send.mutate();
              else setError(t("Enter a valid mobile number"));
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="phone-number">{status.maskedPhone ? t("New mobile number") : t("Mobile number")}</Label>
              <Input id="phone-number" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="98765 43210" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} />
              {error && <p role="alert" data-slot="field-error" className="text-xs text-destructive-strong">{error}</p>}
            </div>
            <Button type="submit" loading={send.isPending} disabled={!phone.trim()}>
              {t("Send code")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
