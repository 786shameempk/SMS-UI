import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { routeForPath } from "@/app/routeRegistry";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { canOpenRoute, explainNoAccess } from "@/features/help/access";
import { useViewer } from "@/features/help/useViewer";

/**
 * One rule for every screen: a page opens only when the person's school plan and role include its module, exactly as the menu
 * decides what to show (both read the route registry, which a test keeps in step with the menu). Typing the address or opening a
 * bookmark therefore gets the same answer as the menu, with a plain message instead of a page full of refused requests.
 *
 * This is a convenience, not the security boundary: every service checks the module and the action itself.
 */
export default function RouteGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const viewer = useViewer();
  const route = routeForPath(pathname);

  if (!route || !viewer.role || canOpenRoute(route, viewer)) return <>{children}</>;

  return (
    <PageContainer>
      <EmptyState
        icon={Lock}
        title="This isn't available to you"
        description={explainNoAccess(route, viewer)}
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
