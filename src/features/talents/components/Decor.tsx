import { cn } from "@/utils/cn";

/** Four-point sparkle star. */
export function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path d="M12 0c.6 5.6 3.4 9.4 12 12-8.6 2.6-11.4 6.4-12 12-.6-5.6-3.4-9.4-12-12C8.6 9.4 11.4 5.6 12 0Z" fill="currentColor" />
    </svg>
  );
}

/** A loose painted stroke, used under headings and across heroes. */
export function BrushStroke({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 320 24" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d="M4 16c38-9 76-12 118-10 30 1 52 6 84 5 40-1 72-7 108-4 3 0 3 4 0 4-36 1-66 7-106 8-33 1-56-4-86-4-42-1-80 3-118 7-3 0-3-5 0-6Z"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
}

export function MusicNote({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M9 18.5a3 3 0 1 1-2-2.83V5.5l12-2.5v12.5a3 3 0 1 1-2-2.83V6.1l-8 1.67V18.5Z" />
    </svg>
  );
}

export function PaletteShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2C6.5 2 2 6 2 11.2 2 16 6 20 11 20c1.2 0 1.8-.7 1.8-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.5 1.6-1.5H16c3.3 0 6-2.6 6-5.9C22 5.4 17.5 2 12 2Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
    </svg>
  );
}

/** Ambient decoration for dark hero panels: drifting colour blobs, twinkling sparkles, floating motifs. */
export function HeroDecor({ dense = false }: { dense?: boolean }) {
  const sparkles = [
    { top: "14%", left: "58%", size: 14, delay: "0s", color: "#fcd34d" },
    { top: "70%", left: "8%", size: 10, delay: "1.1s", color: "#c4b5fd" },
    { top: "24%", left: "92%", size: 18, delay: "0.5s", color: "#7dd3fc" },
    { top: "80%", left: "66%", size: 12, delay: "2s", color: "#f0abfc" },
    ...(dense
      ? [
          { top: "40%", left: "40%", size: 8, delay: "1.6s", color: "#5eead4" },
          { top: "10%", left: "25%", size: 9, delay: "2.4s", color: "#fde68a" },
        ]
      : []),
  ];
  return (
    <>
      <div className="cc-blob w-64 h-64 -top-16 -left-10" style={{ background: "#7c3aed" }} />
      <div className="cc-blob w-72 h-72 -bottom-24 right-0" style={{ background: "#0ea5e9", animationDelay: "-6s" }} />
      <div className="cc-blob w-40 h-40 top-10 right-1/3" style={{ background: "#14b8a6", animationDelay: "-11s", opacity: 0.35 }} />
      {sparkles.map((s, i) => (
        <Sparkle key={i} className="cc-sparkle" style={{ top: s.top, left: s.left, width: s.size, height: s.size, color: s.color, animationDelay: s.delay }} />
      ))}
      <MusicNote className="absolute right-[6%] bottom-[18%] w-9 h-9 text-white/15 cc-float hidden sm:block" />
      <PaletteShape className="absolute right-[22%] top-[12%] w-8 h-8 text-white/10 cc-float hidden md:block [animation-delay:-2s]" />
    </>
  );
}

/** Heading with a painted underline accent. */
export function BrushHeading({ children, className, accent = "#a78bfa" }: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      <BrushStroke className="absolute -bottom-1 left-0 w-full h-3 z-0 opacity-40" color={accent} />
    </span>
  );
}
