import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { useAuthStore } from "@/store/authStore";
import type { ModulePermissions } from "@/types/auth";

/**
 * Shows a page only when the signed-in user's school and role include its module, matching the nav (a user
 * without the module never sees the link, and opening the URL directly lands here). Services still enforce
 * access themselves; this just avoids a page full of 403s. No permissions loaded yet means "allow", as in the nav.
 */
export default function RequireModule({ module, children }: { module: keyof ModulePermissions; children: ReactNode }) {
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  if (!modulePermissions || modulePermissions[module]) return <>{children}</>;

  return (
    <PageContainer>
      <EmptyState
        icon={Lock}
        title="This module isn't available to you"
        description="Your school's plan or your role doesn't include it. Ask your school administrator if you need access."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
