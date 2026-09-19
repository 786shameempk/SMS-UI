import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/utils/format";
import { CERTIFICATE_TYPE_CONFIG } from "../constants";
import type { IssuedCertificate } from "../types";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle>{certificate ? CERTIFICATE_TYPE_CONFIG[certificate.type].label : "Certificate"}</DialogTitle>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
        </DialogHeader>

        <style>{PRINT_STYLE}</style>
        {certificate && (
          <div id="certificate" className="rounded-xl border border-border bg-white p-6 space-y-5">
            <div className="text-center space-y-1 border-b border-border pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {CERTIFICATE_TYPE_CONFIG[certificate.type].label}
              </p>
              <h2 className="text-lg font-bold text-slate-900">EduCore School</h2>
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

            <p className="text-[11px] text-slate-400 text-center">This is a system-generated certificate.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
