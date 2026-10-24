import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { QrCode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { getMyPass } from "../methods/api";

import { useTranslation } from "react-i18next";
/**
 * The signed-in student's or staff member's attendance pass. It is valid for about a minute and can be scanned once,
 * so a screenshot is useless; the page fetches a fresh one before the old one runs out.
 */
export default function MyAttendancePassPage() {
  const { t } = useTranslation("attendance");
  const pass = useQuery({ queryKey: ["attendance-methods", "my-pass"], queryFn: getMyPass, retry: false, refetchOnWindowFocus: true });
  const [image, setImage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!pass.data) return;
    let cancelled = false;
    QRCode.toDataURL(pass.data.token, { errorCorrectionLevel: "M", margin: 1, width: 320 }).then((url) => !cancelled && setImage(url));
    const expires = new Date(pass.data.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((expires - Date.now()) / 1000));
      setSecondsLeft(left);
      // Swap in a new pass a few seconds early so the one being shown never expires mid-scan.
      if (left <= 5) pass.refetch();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pass.data]);

  return (
    <PageContainer>
      <PageHeader title={t("My attendance pass")} description={t("Show this to your teacher or at the gate. It changes every minute and works once.")} />
      {pass.isError ? (
        <EmptyState icon={QrCode} title={t("No attendance pass")} description={(pass.error as Error).message} action={<Button variant="outline" onClick={() => pass.refetch()}>{t("Try again")}</Button>} />
      ) : (
        <Card className="mx-auto w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 py-6">
            {image ? <img src={image} alt={t("Attendance QR pass")} className="h-64 w-64 rounded-lg bg-white p-2" /> : <div className="h-64 w-64 animate-pulse rounded-lg bg-secondary" />}
            <p className="text-lg font-semibold">{pass.data?.personName ?? "…"}</p>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {pass.isFetching ? t("Getting a fresh pass…") : t("Refreshes in {{secondsLeft}}s", { secondsLeft })}
            </p>
            <Button variant="outline" size="sm" onClick={() => pass.refetch()} disabled={pass.isFetching}>
              <RefreshCw className="h-4 w-4" /> {t("New pass now")}
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
