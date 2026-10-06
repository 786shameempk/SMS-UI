import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { useAuthStore } from "@/store/authStore";

/**
 * Opens a page only for the platform super admin, by role (not by a school module, so it never shows up in roles,
 * the permission matrix or plans). The API enforces the same rule; this just avoids a screen of 403s.
 */
export default function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role === "superAdmin") return <>{children}</>;

  return (
    <PageContainer>
      <EmptyState
        icon={Lock}
        title="This area is only for the platform administrator"
        description="Infrastructure details are restricted to the SchoolSphere super admin."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
