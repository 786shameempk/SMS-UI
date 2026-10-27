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
  /** "floating" sits in the centre of the screen; "inline" fills its parent (the preview in the office portal). */
  variant?: "floating" | "inline";
}

/**
 * An image advertisement. Every advertisement uses the same standard 4:5 portrait frame (recommended image 1080 x 1350 px), filled edge to edge, links only when a safe https link was configured, and goes
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

  const image = (
    <img
      src={imageUrl}
      alt="Advertisement"
      draggable={false}
      className="block aspect-[4/5] w-full object-cover"
      onError={() => {
        setFailed(true);
        closed.current = true;
        onImageError?.();
      }}
    />
  );

  const shell =
    variant === "floating"
      ? "fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem),calc((100dvh-4rem)*0.8))] -translate-x-1/2 -translate-y-1/2"
      : "relative w-full max-w-sm";

  return (
    <aside role="complementary" aria-label="Advertisement" data-testid="advertisement" className={`${shell} overflow-hidden rounded-xl border bg-card shadow-xl`}>
      {isSafeLink(redirectUrl) ? (
        <a href={redirectUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label="Open the advertisement link" className="block">
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
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white shadow hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <div className="h-1 w-full bg-black/10" aria-hidden="true">
        <div className="h-full bg-primary" style={{ width: running ? "0%" : "100%", transition: running ? `width ${Math.max(1, autoCloseSeconds)}s linear` : "none" }} />
      </div>
    </aside>
  );
}
