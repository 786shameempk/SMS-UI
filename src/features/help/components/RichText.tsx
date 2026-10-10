import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Info, Lightbulb, ShieldAlert } from "lucide-react";
import { getRoute } from "@/app/routeRegistry";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";
import { canOpenRoute } from "../access";
import { getArticle } from "../catalog";
import { articleHref, screenshotUrl } from "../links";
import type { Block, CalloutKind, Inline } from "../types";
import { useViewer } from "../useViewer";

/** A link from an article to a screen of the app: live when this reader may open it, plain text otherwise. */
export function RouteLink({ id, children, asButton }: { id: string; children: React.ReactNode; asButton?: boolean }) {
  const viewer = useViewer();
  const route = getRoute(id);
  if (!route || !route.deepLink) return <>{children}</>;
  if (!canOpenRoute(route, viewer)) {
    return (
      <span className="text-muted-foreground" title="This screen is not available to your account">
        {children}
      </span>
    );
  }
  if (asButton) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to={route.path}>
          {children}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    );
  }
  return (
    <Link to={route.path} className="font-medium text-primary-text underline underline-offset-2 hover:text-primary">
      {children}
    </Link>
  );
}

export function InlineText({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "text":
            return <Fragment key={i}>{n.v}</Fragment>;
          case "code":
            return (
              <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
                {n.v}
              </code>
            );
          case "bold":
            return (
              <strong key={i} className="font-semibold text-foreground">
                <InlineText nodes={n.c} />
              </strong>
            );
          case "italic":
            return (
              <em key={i}>
                <InlineText nodes={n.c} />
              </em>
            );
          case "link":
            return (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-text underline underline-offset-2 hover:text-primary">
                <InlineText nodes={n.c} />
              </a>
            );
          case "help": {
            const target = getArticle(n.id);
            if (!target) return <InlineText key={i} nodes={n.c} />;
            return (
              <Link key={i} to={articleHref(n.id)} className="font-medium text-primary-text underline underline-offset-2 hover:text-primary">
                <InlineText nodes={n.c} />
              </Link>
            );
          }
          case "route":
            return (
              <RouteLink key={i} id={n.id}>
                <InlineText nodes={n.c} />
              </RouteLink>
            );
        }
      })}
    </>
  );
}

const CALLOUT: Record<CalloutKind, { icon: typeof Info; label: string; box: string }> = {
  note: { icon: Info, label: "Note", box: "border-info/30 bg-info-soft text-info-strong" },
  tip: { icon: Lightbulb, label: "Tip", box: "border-success/30 bg-success-soft text-success-strong" },
  warning: { icon: AlertTriangle, label: "Warning", box: "border-warning/30 bg-warning-soft text-warning-strong" },
  important: { icon: ShieldAlert, label: "Important", box: "border-destructive/30 bg-destructive-soft text-destructive-strong" },
};

function Screenshot({ shot, alt, caption, file }: { shot: string; alt: string; caption: string; file: string | null }) {
  const [open, setOpen] = useState(false);
  // A screenshot that has not been captured yet leaves no gap or placeholder for readers; the coverage report tracks it.
  if (!file) return null;
  const url = screenshotUrl(file);
  return (
    <figure className="my-4" data-shot={shot}>
      <button type="button" onClick={() => setOpen(true)} className="group block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-card text-left shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Enlarge screenshot: ${alt}`}>
        <img src={url} alt={alt} loading="lazy" className="w-full transition-transform duration-200 group-hover:scale-[1.01]" />
      </button>
      {caption && <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">{caption}</figcaption>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{caption || alt}</DialogTitle>
            <DialogDescription>{alt}</DialogDescription>
          </DialogHeader>
          <img src={url} alt={alt} className="w-full rounded-lg border border-border" />
        </DialogContent>
      </Dialog>
    </figure>
  );
}

/** A paragraph that is only a link to a screen is shown as a button. */
function soleRoute(inline: Inline[]): Extract<Inline, { t: "route" }> | null {
  return inline.length === 1 && inline[0].t === "route" ? inline[0] : null;
}

export function ArticleBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-secondary-foreground">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading": {
            const Tag = (b.level <= 2 ? "h2" : "h3") as "h2" | "h3";
            return (
              <Tag key={i} id={b.id} className={cn("scroll-mt-24 font-semibold text-foreground", b.level <= 2 ? "pt-3 text-xl" : "pt-1 text-base")}>
                {b.text}
              </Tag>
            );
          }
          case "p": {
            const sole = soleRoute(b.inline);
            return sole ? (
              <p key={i}>
                <RouteLink id={sole.id} asButton>
                  <InlineText nodes={sole.c} />
                </RouteLink>
              </p>
            ) : (
              <p key={i}>
                <InlineText nodes={b.inline} />
              </p>
            );
          }
          case "steps":
            return (
              <ol key={i} className="space-y-3">
                {b.items.map((item, n) => (
                  <li key={n} className="flex gap-3">
                    <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground ring-1 ring-inset ring-primary/20">
                      {n + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p>
                        <InlineText nodes={item.inline} />
                      </p>
                      {item.notes.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {item.notes.map((note, k) => (
                            <li key={k}>
                              <InlineText nodes={note} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-6 marker:text-muted-foreground">
                {b.items.map((item, n) => (
                  <li key={n}>
                    <InlineText nodes={item} />
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <thead className="bg-muted/60 text-foreground">
                    <tr>
                      {b.head.map((h, n) => (
                        <th key={n} scope="col" className="px-3 py-2 font-semibold">
                          <InlineText nodes={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {b.rows.map((row, r) => (
                      <tr key={r} className="align-top">
                        {row.map((cell, c) => (
                          <td key={c} className="px-3 py-2">
                            <InlineText nodes={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "callout": {
            const meta = CALLOUT[b.kind] ?? CALLOUT.note;
            const Icon = meta.icon;
            return (
              <div key={i} role="note" className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6", meta.box)}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  <strong className="font-semibold">{meta.label}: </strong>
                  <InlineText nodes={b.inline} />
                </p>
              </div>
            );
          }
          case "image":
            return <Screenshot key={i} shot={b.shot} alt={b.alt} caption={b.caption} file={b.file} />;
          case "hr":
            return <hr key={i} className="border-border" />;
        }
      })}
    </div>
  );
}
