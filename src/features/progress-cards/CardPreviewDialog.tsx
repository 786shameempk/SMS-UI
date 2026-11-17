import { useTranslation } from "react-i18next";
import { Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardRenderer } from "./CardRenderer";
import { printCards } from "./printCards";
import type { CardData, TemplateConfig } from "./types";

/** Centered pop-up that renders one progress card with a Print button. Used wherever a card is "viewed". */
export function CardPreviewDialog({ preview, onClose }: { preview: { config: TemplateConfig; data: CardData } | null; onClose: () => void }) {
  const { t } = useTranslation("progress-cards");
  return (
    <Dialog open={!!preview} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="inset-auto start-1/2 top-1/2 h-[92dvh] w-[calc(100vw-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-xl border data-[state=open]:slide-in-from-right-0 data-[state=closed]:slide-out-to-right-0 data-[state=open]:zoom-in-95"
      >
        {preview && (
          <>
            <DialogHeader>
              <DialogTitle>{preview.data.studentName} · {preview.data.examName}</DialogTitle>
              <DialogDescription className="sr-only">{t("Progress card preview")}</DialogDescription>
            </DialogHeader>
            <div className="overflow-auto rounded-xl border border-border bg-muted/40 p-4">
              <div className="mx-auto w-fit"><CardRenderer config={preview.config} data={preview.data} /></div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => !printCards(preview.config, [preview.data], `${preview.data.studentName} - ${preview.data.examName}`) && toast.error(t("Allow pop-ups to print."))}>
                <Printer className="h-4 w-4" /> {t("Print")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
