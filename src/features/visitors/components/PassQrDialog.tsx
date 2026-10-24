import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/utils/format";
import { visitorPassValue } from "../passCode";

export interface PassQrSubject {
  kind: "badge" | "invitation";
  visitorName: string;
  badgeNumber?: string;
  token: string;
  /** Badge: when the visit began. Invitation: when it is expected. */
  at: string;
  expiresAt?: string;
}

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #visitor-pass, #visitor-pass * { visibility: visible; }
    #visitor-pass { position: absolute; top: 0; left: 0; }
  }
`;

/** The QR code for a visitor's badge (printed at check-in) or invitation (sent to the visitor). Security scans it at the gate. */
export default function PassQrDialog({ subject, onClose }: { subject: PassQrSubject | null; onClose: () => void }) {
  const { t } = useTranslation("visitors");
  const [qr, setQr] = useState<string>();
  const value = subject ? visitorPassValue(subject.token) : undefined;

  useEffect(() => {
    let cancelled = false;
    setQr(undefined);
    if (value) QRCode.toDataURL(value, { margin: 1, width: 220 }).then((url) => !cancelled && setQr(url)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <Dialog open={Boolean(subject)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{subject?.kind === "invitation" ? t("Visit pass") : t("Visitor badge")}</DialogTitle>
          <DialogDescription>
            {subject?.kind === "invitation" ? t("Send or print this for the visitor to show at the gate.") : t("Print this badge for the visitor to wear or carry.")}
          </DialogDescription>
        </DialogHeader>
        <style>{PRINT_STYLE}</style>
        {subject && (
          <div id="visitor-pass" className="rounded-xl border border-border bg-white p-5 text-center space-y-2">
            <p className="text-base font-semibold text-slate-900">{subject.visitorName}</p>
            {subject.badgeNumber && <p className="text-sm font-medium text-slate-700">{t("Badge {{badge}}", { badge: subject.badgeNumber })}</p>}
            {qr ? <img src={qr} alt={t("QR code for this pass")} className="mx-auto h-44 w-44" /> : <div className="mx-auto h-44 w-44" />}
            <p className="text-xs text-slate-500">
              {subject.kind === "invitation" ? t("Expected {{when}}", { when: formatDateTime(subject.at) }) : t("In since {{when}}", { when: formatDateTime(subject.at) })}
            </p>
            {subject.expiresAt && <p className="text-xs text-slate-500">{t("Valid until {{when}}", { when: formatDateTime(subject.expiresAt) })}</p>}
            <p className="break-all font-mono text-[11px] text-slate-500">{subject.token}</p>
          </div>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          {t("Print")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
