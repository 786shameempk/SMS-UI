import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, SearchX } from "lucide-react";
import { HELP_ROLES, ROLE_LABELS, type HelpRole } from "@/app/routeRegistry";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { visibleArticles } from "../access";
import { articlesForRole, helpCatalog, moduleTitle } from "../catalog";
import { ArticleRow } from "../components/HelpBits";
import { helpHome } from "../links";
import { useViewer } from "../useViewer";

export default function HelpRolePage() {
  const { role = "" } = useParams();
  const viewer = useViewer();
  const valid = (HELP_ROLES as readonly string[]).includes(role);
  const articles = useMemo(() => (valid ? articlesForRole(visibleArticles(helpCatalog.articles, viewer), role as HelpRole) : []), [valid, role, viewer]);
  const byModule = useMemo(() => {
    const groups = new Map<string, typeof articles>();
    for (const a of articles) groups.set(a.module, [...(groups.get(a.module) ?? []), a]);
    return [...groups.entries()].map(([id, list]) => ({ id, list: list.sort((a, b) => a.order - b.order) }));
  }, [articles]);

  if (!valid) {
    return (
      <PageContainer>
        <EmptyState
          icon={SearchX}
          title="That role is not in the guide"
          action={
            <Button asChild variant="outline">
              <Link to={helpHome}>Back to the Help Center</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to={helpHome} className="hover:text-foreground">
          Help Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-current="page" className="font-medium text-foreground">
          {ROLE_LABELS[role as HelpRole]}
        </span>
      </nav>
      <header className="space-y-2">
        <h1 className="text-page-title">Guides for the {ROLE_LABELS[role as HelpRole].toLowerCase()}</h1>
        <p className="max-w-3xl text-muted-foreground">The articles written for this role. Schools can change what each role can open, so a screen described here may not be on for you.</p>
      </header>
      {byModule.length === 0 && <p className="text-sm text-muted-foreground">There are no articles for this role yet.</p>}
      {byModule.map(({ id, list }) => (
        <section key={id} className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            <Link to={`/help/m/${id}`} className="hover:text-primary-text">
              {moduleTitle(id)}
            </Link>
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {list.map((a) => (
              <li key={a.id}>
                <ArticleRow article={a} showModule={false} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageContainer>
  );
}
