import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { REACTION_CONFIG, REACTION_ORDER } from "../constants";
import { formatCount, useReaction } from "../hooks";
import type { ReactionCounts, TalentCard, TalentReactionType } from "../types";

interface Burst {
  id: number;
  emoji: string;
}

/** Stacked emoji summary ("❤️👏🌟 24") - the top three reaction types present. */
export function ReactionSummary({ reactions, total, className }: { reactions: ReactionCounts; total: number; className?: string }) {
  const top = REACTION_ORDER.filter((t) => (reactions[t] ?? 0) > 0)
    .sort((a, b) => (reactions[b] ?? 0) - (reactions[a] ?? 0))
    .slice(0, 3);
  if (total === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} title={REACTION_ORDER.filter((t) => reactions[t]).map((t) => `${REACTION_CONFIG[t].label}: ${reactions[t]}`).join(" · ")}>
      <span className="flex -space-x-1">
        {top.map((t) => (
          <span key={t} className="w-5 h-5 rounded-full bg-card ring-2 ring-card flex items-center justify-center text-[11px]">
            {REACTION_CONFIG[t].emoji}
          </span>
        ))}
      </span>
      <span className="tabular-nums">{formatCount(total)}</span>
    </span>
  );
}

/**
 * The appreciation bar. One reaction per person (tap again to undo, pick another to switch). Updates are
 * optimistic and celebrated with a small emoji burst; counts are shown but kept quiet on purpose.
 */
export default function ReactionBar({ talent, disabled, compact = false }: { talent: TalentCard; disabled?: boolean; compact?: boolean }) {
  const mutation = useReaction(talent);
  const [mine, setMine] = useState<TalentReactionType | undefined>(talent.myReaction);
  const [counts, setCounts] = useState<ReactionCounts>(talent.reactions);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);

  // Reconcile with server data whenever the query refreshes.
  useEffect(() => {
    setMine(talent.myReaction);
    setCounts(talent.reactions);
  }, [talent.myReaction, talent.reactions]);

  const choose = (type: TalentReactionType) => {
    if (disabled || mutation.isPending) return;
    const next = mine === type ? undefined : type;
    setCounts((prev) => {
      const updated = { ...prev };
      if (mine) updated[mine] = Math.max(0, (updated[mine] ?? 1) - 1);
      if (next) updated[next] = (updated[next] ?? 0) + 1;
      return updated;
    });
    setMine(next);
    if (next) {
      const id = ++burstId.current;
      setBursts((b) => [...b, { id, emoji: REACTION_CONFIG[next].emoji }]);
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
    }
    mutation.mutate(next ?? null, {
      onError: () => {
        setMine(talent.myReaction);
        setCounts(talent.reactions);
      },
    });
  };

  return (
    <div className={cn("relative flex flex-wrap items-center", compact ? "gap-1" : "gap-1.5 sm:gap-2")} role="group" aria-label="Appreciate this talent">
      {REACTION_ORDER.map((type) => {
        const config = REACTION_CONFIG[type];
        const active = mine === type;
        const count = counts[type] ?? 0;
        return (
          <motion.button
            key={type}
            type="button"
            whileTap={{ scale: 0.85 }}
            whileHover={disabled ? undefined : { y: -2 }}
            onClick={() => choose(type)}
            disabled={disabled}
            aria-pressed={active}
            title={disabled ? "Reactions open once this is published" : config.label}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
              compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
              active
                ? "border-transparent bg-gradient-to-r from-violet-500/15 via-fuchsia-500/15 to-sky-500/15 ring-1 ring-violet-400/60 text-foreground font-semibold"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-violet-300",
            )}
          >
            <motion.span
              key={active ? "on" : "off"}
              initial={active ? { scale: 0.4, rotate: -20 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
              className={compact ? "text-sm" : "text-base"}
              aria-hidden="true"
            >
              {config.emoji}
            </motion.span>
            {!compact && <span className="hidden sm:inline">{config.label === "Congratulations" ? "Congrats" : config.label}</span>}
            {count > 0 && <span className="tabular-nums text-xs opacity-80">{formatCount(count)}</span>}
          </motion.button>
        );
      })}

      <AnimatePresence>
        {bursts.map((b) =>
          [0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={`${b.id}-${i}`}
              className="pointer-events-none absolute left-1/2 top-0 text-lg"
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 0, x: (i - 2) * 26, y: -50 - (i % 2) * 18, scale: 1.3, rotate: (i - 2) * 12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              aria-hidden="true"
            >
              {b.emoji}
            </motion.span>
          )),
        )}
      </AnimatePresence>
    </div>
  );
}
