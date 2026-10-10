import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, FileDown, Search, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { useAskAi } from "@/features/ai/askAi";
import { KIND_LABEL, moduleTitle } from "../catalog";
import { articleHref, MANUAL_PDF_URL } from "../links";
import { getFeedback, saveFeedback, type Helpful } from "../storage";
import type { HelpArticle } from "../types";
import type { SearchHit } from "../search";

/** The review state of an article, in words a reader understands. */
export function ReviewBadge({ article }: { article: HelpArticle }) {
  if (article.status === "verified") {
    return (
      <Badge variant="success">
        <BadgeCheck className="h-3 w-3" aria-hidden="true" />
        Verified{article.verifiedOn ? ` ${article.verifiedOn}` : ""}
      </Badge>
    );
  }
  if (article.status === "reviewed") return <Badge variant="info">Checked against the app</Badge>;
  return <Badge variant="neutral">Draft</Badge>;
}

export function ArticleRow({ article, snippet, showModule = true }: { article: HelpArticle; snippet?: string; showModule?: boolean }) {
  return (
    <Link
      to={articleHref(article.id)}
      className="group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-foreground">{article.title}</span>
          <Badge variant="neutral">{KIND_LABEL[article.kind]}</Badge>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{snippet ?? article.summary}</p>
        {showModule && <p className="mt-1 text-xs text-muted-foreground">{moduleTitle(article.module)}</p>}
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary-text" aria-hidden="true" />
    </Link>
  );
}

export function SearchResults({ hits, query }: { hits: SearchHit[]; query: string }) {
  if (hits.length === 0) {
    return (
      <div role="status" className="rounded-xl border border-dashed border-border p-8 text-center">
        <Search className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 font-medium text-foreground">No articles match “{query}”</p>
        <p className="mt-1 text-sm text-muted-foreground">Try fewer or different words, browse by module, or ask School AI.</p>
        <AskAiButton className="mt-3" />
      </div>
    );
  }
  return (
    <ul className="space-y-2" aria-label={`${hits.length} result${hits.length === 1 ? "" : "s"} for ${query}`}>
      {hits.map((h) => (
        <li key={h.article.id}>
          <ArticleRow article={h.article} snippet={h.snippet} />
        </li>
      ))}
    </ul>
  );
}

/** Opens the Ask School AI panel; the assistant answers from this same documentation. */
export function AskAiButton({ className }: { className?: string }) {
  const setOpen = useAskAi((s) => s.setOpen);
  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      Ask School AI
    </Button>
  );
}

export function ManualDownload({ className }: { className?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <a href={MANUAL_PDF_URL} download>
        <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
        Download the PDF manual
      </a>
    </Button>
  );
}

export function Feedback({ articleId }: { articleId: string }) {
  const [answer, setAnswer] = useState<Helpful | null>(() => getFeedback(articleId));
  const choose = (value: Helpful) => {
    saveFeedback(articleId, value);
    setAnswer(value);
  };
  return (
    <section aria-label="Feedback" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      {answer ? (
        <p role="status" className="text-sm text-muted-foreground">
          {answer === "yes" ? "Thanks, glad it helped." : "Thanks for telling us. You can also ask School AI, or ask your school administrator."}
        </p>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">Was this helpful?</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => choose("yes")} aria-label="Yes, this was helpful">
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
              Yes
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => choose("no")} aria-label="No, this was not helpful">
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
              No
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground", className)}>{children}</span>;
}
