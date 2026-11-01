import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { isSafeLink } from "./rules";

export interface AdvertisementBannerProps {
  imageUrl: string;
  redirectUrl?: string | null;
  autoCloseSeconds: number;
  showCloseButton: boolean;
  /** Called exactly once, whether the person closed it or the time ran out. */
  onClose: () => void;
  /** The image could not be loaded: nothing is shown and the owner should drop the advertisement. */
  onImageError?: () => void;
  /** "floating" is a centred window of 70% of the screen width and 60% of its height over a dimmed page; "inline" fills its parent (the preview in the office portal). */
  variant?: "floating" | "inline";
}

/**
 * An image advertisement. On the web home page it opens in a 70% x 60% window; the image is shown whole (never cropped) on a soft blurred copy of itself. The inline preview keeps the standard 4:5 portrait frame (recommended image 1080 x 1350 px). It links only when a safe https link was configured, and goes
 * away by itself after the configured time whether or not it has a close button. The close button and the link are separate controls, so closing never
 * follows the link and following the link never needs the close button.
 */
export default function AdvertisementBanner({ imageUrl, redirectUrl, autoCloseSeconds, showCloseButton, onClose, onImageError, variant = "floating" }: AdvertisementBannerProps) {
  const closed = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState(false);

  const close = () => {
    if (closed.current) return;
    closed.current = true;
    onCloseRef.current();
  };

  // One timer per appearance. It is cleared when the banner closes, when it is removed from the page, and when the time changes.
  useEffect(() => {
    closed.current = false;
    const frame = window.requestAnimationFrame(() => setRunning(true));
    const timer = window.setTimeout(close, Math.max(1, autoCloseSeconds) * 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCloseSeconds, imageUrl]);

  if (failed) return null;

  const floating = variant === "floating";
  const image = (
    <img
      src={imageUrl}
      alt="Advertisement"
      draggable={false}
      className={floating ? "relative z-10 block h-full w-full object-contain" : "block aspect-[4/5] w-full object-cover"}
      onError={() => {
        setFailed(true);
        closed.current = true;
        onImageError?.();
      }}
    />
  );

  const frame = floating
    ? "relative h-[70dvh] w-[92vw] sm:h-[60dvh] sm:w-[70vw]"
    : "relative w-full max-w-sm";

  const ad = (
    <aside role="complementary" aria-label="Advertisement" data-testid="advertisement" className={`${frame} overflow-hidden rounded-2xl border bg-card shadow-2xl`}>
      {floating && (
        <img src={imageUrl} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
      )}
      {isSafeLink(redirectUrl) ? (
        <a href={redirectUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label="Open the advertisement link" className={floating ? "block h-full w-full" : "block"}>
          {image}
        </a>
      ) : (
        image
      )}
      {showCloseButton && (
        <button
          type="button"
          onClick={close}
          aria-label="Close advertisement"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white shadow hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <div className={`${floating ? "absolute inset-x-0 bottom-0 z-20" : ""} h-1 w-full bg-black/10`} aria-hidden="true">
        <div className="h-full bg-primary" style={{ width: running ? "0%" : "100%", transition: running ? `width ${Math.max(1, autoCloseSeconds)}s linear` : "none" }} />
      </div>
    </aside>
  );

  // The floating window sits over a dimmed page; the backdrop only dims, so it never closes the advertisement or follows its link.
  return floating ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">{ad}</div> : ad;
}
