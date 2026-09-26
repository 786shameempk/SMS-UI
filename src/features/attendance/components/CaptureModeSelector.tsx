import { CreditCard, Fingerprint, Hand, Info, QrCode, ScanFace, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { CAPTURE_MODES } from "../constants";
import type { CaptureMode } from "../types";

const MODE_ICONS: Record<CaptureMode, LucideIcon> = {
  manual: Hand,
  qr: QrCode,
  rfid: CreditCard,
  biometric: Fingerprint,
  face: ScanFace,
  mobile: Smartphone,
};

export default function CaptureModeSelector({
  value,
  onChange,
}: {
  value: CaptureMode;
  onChange: (mode: CaptureMode) => void;
}) {
  const selected = CAPTURE_MODES.find((m) => m.value === value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {CAPTURE_MODES.map((mode) => {
          const Icon = MODE_ICONS[mode.value];
          const active = mode.value === value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-secondary-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {mode.label}
            </button>
          );
        })}
      </div>
      {selected?.simulated && (
        <p className="flex items-start gap-1.5 rounded-md bg-warning-soft border border-warning/30 px-2.5 py-2 text-xs text-warning-strong">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Simulated — {selected.label} hardware integration is not available in this demo. Use the manual grid below to record attendance.
        </p>
      )}
    </div>
  );
}
