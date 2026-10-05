import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/utils/cn";
import { useTenantBranding } from "@/features/tenant/TenantProvider";

/**
 * The logo tile used in the sidebar and on the login page: the school's uploaded logo when it has one, School
 * Sphere's mark otherwise (also when the image fails to load, so a broken link never leaves a hole).
 */
export default function BrandLogo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const { logoUrl, name } = useTenantBranding();
  // Remember which URL failed, so a newly uploaded logo gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string>();

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card ring-1 ring-inset ring-border", className)}>
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-contain" onError={() => setFailedUrl(logoUrl)} />
      </div>
    );
  }
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary bg-brand-gradient text-primary-foreground shadow-brand", className)}>
      <GraduationCap className={cn("h-[18px] w-[18px]", iconClassName)} aria-hidden="true" />
    </div>
  );
}
