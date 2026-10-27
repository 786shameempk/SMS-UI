import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";

interface ExportMenuProps {
  /** Downloads the data as a CSV file. */
  onCsv: () => void;
  /** Opens the data as a PDF (print dialog > Save as PDF). Return false when the browser blocked the pop-up. */
  onPdf: () => boolean | void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "default";
  /** Hides the word on narrow screens, keeping an accessible name. */
  compactLabel?: boolean;
  className?: string;
}

/**
 * The one export control used across the app: a single "Export" button that offers CSV and PDF, so no screen has a CSV-only download.
 * Keyboard and screen-reader friendly (a labelled menu button, two named menu items).
 */
export function ExportMenu({ onCsv, onPdf, disabled, label, size = "sm", compactLabel, className }: ExportMenuProps) {
  const { t } = useTranslation("common");
  const text = label ?? t("Export");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={disabled} className={className} aria-label={compactLabel ? text : undefined}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span className={cn(compactLabel && "hidden lg:inline")}>{text}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onCsv}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          {t("CSV (opens in Excel)")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            if (onPdf() === false) toast.error(t("Allow pop-ups for this site to export the PDF."));
          }}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {t("PDF (choose Save as PDF)")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
