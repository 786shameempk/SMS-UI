import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, ChevronRight, SearchX } from "lucide-react";
import { ROLE_LABELS, ROUTES, getModule, menuPathOf } from "@/app/routeRegistry";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { canOpenRoute, canRead, canUseModule } from "../access";
import { KIND_LABEL, KIND_ORDER, articlesOfModule, helpCatalog } from "../catalog";
import { ArticleRow, Pill } from "../components/HelpBits";
import { helpHome } from "../links";
import { useViewer } from "../useViewer";

export default function HelpModulePage() {
  const { moduleId = "" } = useParams();
  const viewer = useViewer();
  const module = getModule(moduleId);
  const articles = articlesOfModule(helpCatalog.articles, moduleId).filter((a) => canRead(a.access, viewer));

  if (!module || (articles.length === 0 && !canRead(module.access, viewer))) {
    return (
      <PageContainer>
        <EmptyState
          icon={SearchX}
          title="This part of the guide is not available"
          description="It may not exist, or it may be written for a different role."
          action={
            <Button asChild variant="outline">
              <Link to={helpHome}>Back to the Help Center</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const screens = ROUTES.filter((r) => r.moduleId === module.id && r.menuItem && canOpenRoute(r, viewer));
  const menu = ROUTES.find((r) => r.moduleId === module.id && r.menuItem);

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to={helpHome} className="hover:text-foreground">
          Help Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-current="page" className="font-medium text-foreground">
          {module.title}
        </span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-page-title">{module.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{module.purpose}</p>
        <div className="flex flex-wrap items-center gap-2">
          {menu && <Pill>Menu: {menuPathOf(menu).join(" → ")}</Pill>}
          {!canUseModule(module, viewer) && viewer.role && <Pill>Not available to your account</Pill>}
          {screens.slice(0, 3).map((r) => (
            <Button key={r.id} asChild size="sm" variant="outline">
              <Link to={r.path}>
                Open {r.label}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Available by default to: </span>
          {module.defaultRoles.map((r) => ROLE_LABELS[r]).join(", ")}. Schools can change this under Roles &amp; Permissions.
        </p>
      </header>

      {KIND_ORDER.map((kind) => {
        const list = articles.filter((a) => a.kind === kind);
        if (list.length === 0) return null;
        return (
          <section key={kind} className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">{KIND_LABEL[kind]}</h2>
            <ul className="grid gap-2 lg:grid-cols-2">
              {list.map((a) => (
                <li key={a.id}>
                  <ArticleRow article={a} showModule={false} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {articles.length === 0 && <p className="text-sm text-muted-foreground">The guide for this module is still being written.</p>}
    </PageContainer>
  );
}
