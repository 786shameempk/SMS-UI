import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Letterhead from "@/features/tenant/Letterhead";
import { formatDateTime } from "@/utils/format";
import { CERTIFICATE_TYPE_CONFIG } from "../constants";
import type { IssuedCertificate } from "../types";
import { certificateVerifyUrl } from "../verifyUrl";
import CertificateStatusBadge from "./CertificateStatusBadge";

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #certificate, #certificate * { visibility: visible; }
    #certificate { position: absolute; top: 0; left: 0; }
  }
`;

export default function CertificateView({
  open,
  onOpenChange,
  certificate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: IssuedCertificate | null;
}) {
  const { t } = useTranslation("certificates");
  const [qr, setQr] = useState<string>();
  const token = certificate?.verificationToken;
  const verifyUrl = token ? certificateVerifyUrl(token) : undefined;
  useEffect(() => {
    let cancelled = false;
    setQr(undefined);
    if (verifyUrl) QRCode.toDataURL(verifyUrl, { margin: 1, width: 160 }).then((url) => !cancelled && setQr(url)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [verifyUrl]);
  const notValid = certificate !== null && certificate.status !== "valid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2">
            {certificate ? t(CERTIFICATE_TYPE_CONFIG[certificate.type].label) : t("Certificate")}
            {certificate && <CertificateStatusBadge status={certificate.status} />}
          </DialogTitle>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            {t("Print")}
          </Button>
        </DialogHeader>

        <style>{PRINT_STYLE}</style>
        {certificate && (
          <div id="certificate" className="relative rounded-xl border border-border bg-white p-6 space-y-5">
            {notValid && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="-rotate-25 border-4 border-red-500/60 px-4 py-1 text-4xl font-black uppercase tracking-widest text-red-500/60">
                  {certificate.status === "revoked" ? "Revoked" : "Replaced"}
                </span>
              </div>
            )}
            <div className="text-center space-y-1 border-b border-border pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {CERTIFICATE_TYPE_CONFIG[certificate.type].label}
              </p>
              <Letterhead />
              <p className="text-sm text-slate-500">Certificate No: {certificate.certificateNumber}</p>
            </div>

            <div className="space-y-3">
              {certificate.bodyLines.map((line, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed text-justify">
                  {line}
                </p>
              ))}
            </div>

            {certificate.meta.length > 0 && (
              <div className="rounded-lg bg-secondary/40 p-3 grid grid-cols-2 gap-2 text-xs">
                {certificate.meta.map((m) => (
                  <div key={m.label}>
                    <span className="text-muted-foreground">{m.label}: </span>
                    <span className="font-medium text-slate-800">{m.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end justify-between pt-6">
              <p className="text-xs text-slate-400">Issued on {formatDateTime(certificate.issuedOn)}</p>
              <div className="text-center">
                <div className="w-32 border-t border-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Principal's signature</p>
              </div>
            </div>

            {verifyUrl && (
              <div className="flex items-center gap-3 border-t border-border pt-3">
                {qr ? <img src={qr} alt="QR code to verify this certificate" className="h-20 w-20 shrink-0" /> : <div className="h-20 w-20 shrink-0" />}
                <div className="min-w-0 text-[11px] text-slate-500">
                  <p className="font-medium text-slate-700">Verify this certificate</p>
                  <p>Scan the code, or open the address below and check that it shows this number.</p>
                  <p className="break-all font-mono">{verifyUrl}</p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">This is a system-generated certificate.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
