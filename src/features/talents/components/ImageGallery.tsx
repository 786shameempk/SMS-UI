import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { TalentMedia } from "../types";

/** Stage + thumbnail strip, with a full-screen lightbox (keyboard arrows, Esc, swipe). */
export default function ImageGallery({ images, title }: { images: TalentMedia[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const current = images[index];

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + images.length) % images.length), [images.length]);

  if (!current) return null;

  return (
    <div className="space-y-2.5">
      <div className="group relative overflow-hidden rounded-3xl bg-[#0b1030] aspect-[4/3] sm:aspect-[16/10]">
        {/* Blurred backdrop fills letterboxing for portrait artwork. */}
        <img src={current.url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50" />
        <AnimatePresence mode="wait">
          <motion.img
            key={current.id}
            src={current.url}
            alt={current.caption ?? `${title} - image ${index + 1}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative w-full h-full object-contain cursor-zoom-in"
            onClick={() => setLightbox(true)}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <NavButton side="left" onClick={() => go(-1)} />
            <NavButton side="right" onClick={() => go(1)} />
            <span className="absolute top-3 left-3 rounded-full bg-black/45 backdrop-blur-md px-2.5 py-0.5 text-xs text-white tabular-nums">
              {index + 1} / {images.length}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
          aria-label="View full screen"
        >
          <Expand className="w-4 h-4" />
        </button>
        {current.caption && (
          <p className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm text-white">{current.caption}</p>
        )}
      </div>

      {images.length > 1 && (
        <div className="cc-rail flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden cursor-pointer transition-all",
                i === index ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100",
              )}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && <Lightbox images={images} index={index} onIndex={setIndex} onClose={() => setLightbox(false)} title={title} />}
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white flex items-center justify-center cursor-pointer transition-colors",
        side === "left" ? "left-3" : "right-3",
      )}
      aria-label={side === "left" ? "Previous image" : "Next image"}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function Lightbox({ images, index, onIndex, onClose, title }: { images: TalentMedia[]; index: number; onIndex: (i: number) => void; onClose: () => void; title: string }) {
  const touchStart = useRef<number | null>(null);
  const go = useCallback((delta: number) => onIndex((index + delta + images.length) % images.length), [index, images.length, onIndex]);

  useEffect(() => {
    // Capture phase on window: the lightbox consumes Esc/arrows before any enclosing panel (Radix
    // listens on document) can react and close itself too.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.stopPropagation();
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  const current = images[index]!;
  return createPortal(
    <motion.div
      // pointer-events-auto + the data attribute let it work above a modal side panel (Radix disables
      // pointer events on <body> and would treat clicks here as "outside" - see ReviewPanel).
      data-cc-lightbox=""
      className="fixed inset-0 z-[60] bg-[#05081c]/95 backdrop-blur-sm flex flex-col pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} gallery`}
      onTouchStart={(e) => (touchStart.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0]!.clientX - touchStart.current;
        if (Math.abs(dx) > 50) go(dx > 0 ? -1 : 1);
        touchStart.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm tabular-nums text-white/70">
          {index + 1} / {images.length}
        </span>
        <p className="text-sm font-medium truncate px-4">{title}</p>
        <button type="button" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16" onClick={onClose}>
        <AnimatePresence mode="wait">
          <motion.img
            key={current.id}
            src={current.url}
            alt={current.caption ?? title}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <div onClick={(e) => e.stopPropagation()}>
            <NavButton side="left" onClick={() => go(-1)} />
            <NavButton side="right" onClick={() => go(1)} />
          </div>
        )}
      </div>
      {current.caption && <p className="text-center text-sm text-white/80 px-6 py-2">{current.caption}</p>}
      <div className="cc-rail flex justify-center gap-2 overflow-x-auto px-4 py-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onIndex(i)}
            className={cn("shrink-0 w-12 h-12 rounded-lg overflow-hidden cursor-pointer", i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-90")}
            aria-label={`Show image ${i + 1}`}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </motion.div>,
    document.body,
  );
}
