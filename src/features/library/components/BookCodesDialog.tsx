import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Book } from "../types";

export default function BookCodesDialog({
  open,
  onOpenChange,
  book,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: Book | null;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !book) return;
    let cancelled = false;
    QRCode.toDataURL(`EDUCORE-BOOK:${book.id}:${book.isbn}`, { margin: 1, width: 140 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, book]);

  /**
   * Radix Dialog mounts its content into a portal only once the open animation settles, so a
   * plain useRef + useEffect can fire before the <svg> node exists. A callback ref runs exactly
   * when the node attaches, so JsBarcode always has a live element to draw into.
   */
  const setBarcodeRef = useCallback(
    (node: SVGSVGElement | null) => {
      if (!node || !book) return;
      JsBarcode(node, book.isbn, {
        format: "CODE128",
        height: 50,
        width: 1.8,
        fontSize: 12,
        margin: 6,
      });
    },
    [book],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{book?.title ?? "Book codes"}</DialogTitle>
          <DialogDescription>Barcode encodes the ISBN; QR code encodes the book ID for scanning at the desk.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <svg ref={setBarcodeRef} />
          {qrDataUrl && <img src={qrDataUrl} alt="Book QR code" className="w-32 h-32" />}
          <p className="text-xs text-muted-foreground">ISBN: {book?.isbn}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
