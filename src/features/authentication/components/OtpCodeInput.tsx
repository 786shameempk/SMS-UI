import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

export const OTP_LENGTH = 6;

/**
 * One field for the code rather than six boxes: phones fill it from the SMS ("one-time-code"), paste works, and screen readers
 * hear a single labelled field. Only digits are kept.
 */
export default function OtpCodeInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
  autoFocus,
  "aria-describedby": describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={OTP_LENGTH}
      placeholder={"•".repeat(OTP_LENGTH)}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      dir="ltr"
      className={cn("h-12 rounded-xl text-center font-mono text-2xl tracking-[0.5em] ps-[0.5em]")}
    />
  );
}
