import { useState } from "react";
import { Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { getSectionRoster, listAttendanceRecords } from "../../api";
import { dateRange, printRegister } from "../../registerPrint";

import { useTranslation } from "react-i18next";

interface Props {
  /** The section's register to print; the button is disabled until one is chosen. */
  sectionId: string;
  classLabel: string;
  dateFrom: string;
  dateTo: string;
  /** e.g. "October 2026". */
  period: string;
  title?: string;
  disabled?: boolean;
}

/** Prints the attendance register for one section (names down the side, dates across, ✓/✗ in the boxes). */
export default function PrintRegisterButton({ sectionId, classLabel, dateFrom, dateTo, period, title = "Student attendance register", disabled }: Props) {
  const { t } = useTranslation("attendance");
  const branding = useTenantBranding();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const [roster, records] = await Promise.all([getSectionRoster(sectionId), listAttendanceRecords({ sectionId, dateFrom, dateTo })]);
      const opened = printRegister({ title, period, classLabel, dates: dateRange(dateFrom, dateTo), roster, records, branding });
      if (!opened) toast.error(t("Allow pop-ups for this site to print the register."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Could not load the register."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={run} disabled={disabled || busy || !sectionId}>
      <Printer className="h-4 w-4" />
      {busy ? t("Preparing…") : t("Print register")}
    </Button>
  );
}
