import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, CircleAlert, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "@/components/ui/states";
import { formatDateTime } from "@/utils/format";
import { CERTIFICATE_TYPE_CONFIG } from "../constants";
import { verifyCertificate } from "../api";

/**
 * Opened by scanning the QR code on a printed certificate. Public (no sign-in): shows only whether the certificate is genuine and still
 * valid, who it was issued to and by which school; never its wording.
 */
export default function VerifyCertificatePage() {
  const { t } = useTranslation("certificates");
  const { token = "" } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["verify-certificate", token],
    queryFn: () => verifyCertificate(token),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <main className="min-h-screen bg-background px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-center text-lg font-semibold text-foreground">{t("Certificate verification")}</h1>

        {isLoading && <LoadingState label={t("Checking")} />}

        {isError && (
          <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3" role="alert">
            <CircleAlert className="mx-auto h-8 w-8 text-warning" />
            <p className="text-sm text-foreground">{t("We could not check this certificate right now. Please wait a minute and try again.")}</p>
            <button type="button" className="text-sm font-medium text-primary-text underline" onClick={() => refetch()}>
              {t("Try again")}
            </button>
          </div>
        )}

        {!isLoading && !isError && data === null && (
          <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-6 text-center space-y-2" role="alert">
            <ShieldX className="mx-auto h-8 w-8 text-destructive-strong" />
            <p className="font-semibold text-destructive-strong">{t("Not found")}</p>
            <p className="text-sm text-foreground">{t("No certificate matches this code. Do not rely on the paper you are holding.")}</p>
          </div>
        )}

        {data && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="text-center space-y-2">
              {data.status === "valid" ? <BadgeCheck className="mx-auto h-10 w-10 text-success" /> : <ShieldX className="mx-auto h-10 w-10 text-destructive-strong" />}
              <p className={data.status === "valid" ? "text-lg font-semibold text-success-strong" : "text-lg font-semibold text-destructive-strong"}>
                {data.status === "valid" ? t("Valid certificate") : data.status === "revoked" ? t("Revoked: not valid") : t("Replaced: not valid")}
              </p>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("Certificate")}</dt>
              <dd className="text-foreground">{t(CERTIFICATE_TYPE_CONFIG[data.type].label)}</dd>
              <dt className="text-muted-foreground">{t("Number")}</dt>
              <dd className="font-mono text-foreground">{data.certificateNumber}</dd>
              <dt className="text-muted-foreground">{t("Issued to")}</dt>
              <dd className="text-foreground">{data.recipientName}</dd>
              {data.schoolName && (
                <>
                  <dt className="text-muted-foreground">{t("Issued by")}</dt>
                  <dd className="text-foreground">{data.schoolName}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{t("Issued on")}</dt>
              <dd className="text-foreground">{formatDateTime(data.issuedOn)}</dd>
              {data.revokedAt && (
                <>
                  <dt className="text-muted-foreground">{t("Withdrawn on")}</dt>
                  <dd className="text-foreground">{formatDateTime(data.revokedAt)}</dd>
                </>
              )}
            </dl>

            {data.status === "superseded" && data.replacementToken && (
              <p className="text-sm text-foreground">
                {t("A corrected certificate was issued:")}{" "}
                <Link className="font-medium text-primary-text underline" to={`/verify/certificate/${data.replacementToken}`}>
                  {data.replacementNumber}
                </Link>
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("Check that the name and number above match the paper you are holding.")}</p>
          </div>
        )}
      </div>
    </main>
  );
}
