import { SearchX } from "lucide-react";
import { isSiteOnOtherOrigin, siteHref } from "@/lib/appUrl";
import { TENANT_BASE_DOMAIN } from "@/lib/tenantHost";

export default function TenantNotFoundPage({ subdomain }: { subdomain: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Tenant not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        There is no active school at{" "}
        <span className="font-medium text-foreground">
          {subdomain}.{TENANT_BASE_DOMAIN}
        </span>
        . Check the address you were given, or contact your school.
      </p>
      <a
        href={isSiteOnOtherOrigin ? siteHref("/") : `https://${TENANT_BASE_DOMAIN}/`}
        className="text-sm font-medium text-primary-text underline-offset-4 hover:underline"
      >
        Go to School Sphere
      </a>
    </main>
  );
}
