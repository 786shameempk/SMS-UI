import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { GraduationCap, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Student } from "../../types";

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #student-id-card, #student-id-card * { visibility: visible; }
    #student-id-card { position: absolute; top: 0; left: 0; }
  }
`;

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function IdCardTab({ student }: { student: Student }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`EDUCORE-STUDENT:${student.admissionNumber}`, { margin: 1, width: 128 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [student.admissionNumber]);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, student.admissionNumber, {
        format: "CODE128",
        height: 40,
        width: 1.6,
        fontSize: 11,
        margin: 4,
      });
    }
  }, [student.admissionNumber]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Student ID card</CardTitle>
          <CardDescription>QR code and barcode encode the admission number for scanning at gates and libraries.</CardDescription>
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="w-3.5 h-3.5" />
          Print ID card
        </Button>
      </CardHeader>
      <CardContent>
        <style>{PRINT_STYLE}</style>
        <div
          id="student-id-card"
          className="w-[340px] rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white mx-auto"
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: "linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)" }}
          >
            <GraduationCap className="w-5 h-5 text-white" />
            <div className="text-white">
              <p className="text-sm font-bold leading-none">EduCore</p>
              <p className="text-[10px] opacity-80 leading-none mt-0.5">Student Identity Card</p>
            </div>
          </div>

          <div className="p-4 flex gap-3">
            <div className="w-20 h-24 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.firstName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-slate-400">{initialsOf(student.firstName, student.lastName)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-bold text-slate-900 truncate">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-xs text-slate-500">
                {student.className} - {student.section} &middot; Roll {student.rollNumber || "—"}
              </p>
              <p className="text-xs text-slate-500">Adm. No: {student.admissionNumber}</p>
              <p className="text-xs text-slate-500">
                Blood group: <span className="font-semibold text-slate-700">{student.medical.bloodGroup === "unknown" ? "—" : student.medical.bloodGroup}</span>
              </p>
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt="Student QR code" className="w-16 h-16 shrink-0" />}
          </div>

          <div className="px-4 pb-4 flex justify-center">
            <svg ref={barcodeRef} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
