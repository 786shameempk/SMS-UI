import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import { useVisibleNav } from "./useVisibleNav";

/** Ctrl/⌘+K "jump to page" palette over the permitted nav items. Pure navigation, no data access. */
export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLUListElement>(null);
  const { coreItems, sections } = useVisibleNav();

  const entries = useMemo(
    () => [
      ...coreItems.map((item) => ({ item, group: "General" })),
      ...sections.flatMap((s) => s.items.map((item) => ({ item, group: s.title }))),
    ],
    [coreItems, sections],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(({ item, group }) => item.label.toLowerCase().includes(q) || group.toLowerCase().includes(q));
  }, [entries, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].item.to);
    }
  };

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="group flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/60 px-2.5 text-sm text-muted-foreground transition-colors hover:border-input hover:bg-card hover:text-foreground cursor-pointer w-9 justify-center lg:w-60 lg:justify-start xl:w-72"
          aria-label="Search pages"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">Search pages…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground lg:inline">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <DialogPrimitive.Title className="sr-only">Search pages</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Type to filter, use the arrow keys to choose and Enter to open.</DialogPrimitive.Description>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to a page…"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-menu-list"
              aria-activedescendant={results[active] ? `command-item-${active}` : undefined}
              className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} id="command-menu-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
            {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">No pages match “{query}”.</li>}
            {results.map(({ item, group }, i) => {
              const showGroup = i === 0 || results[i - 1].group !== group;
              return (
                <li key={item.to} role="presentation">
                  {showGroup && <p className="px-2.5 pb-1 pt-2.5 text-overline">{group}</p>}
                  <div
                    id={`command-item-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(item.to)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm",
                      i === active ? "bg-secondary text-foreground" : "text-secondary-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
                  </div>
                </li>
              );
            })}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
