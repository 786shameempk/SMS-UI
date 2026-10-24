import { useEffect } from "react";
import { APP_URL } from "@/lib/appUrl";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { setIssuingSchoolName } from "./api";

/** The address a certificate's QR code opens: the app's public verification page. */
export function certificateVerifyUrl(token: string): string {
  const origin = APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/verify/certificate/${token}`;
}

/** Certificates carry the school's name so the public page can say who issued them. */
export function useIssuingSchoolName() {
  const { name } = useTenantBranding();
  useEffect(() => {
    setIssuingSchoolName(name);
  }, [name]);
}
