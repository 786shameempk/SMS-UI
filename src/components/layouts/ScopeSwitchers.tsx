import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Globe } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listTenants } from "@/features/platform/api";
import { listBranches } from "@/features/administration/branches/api";
import { getBrandPreset, getDensityPreset, getRadiusPreset } from "@/features/settings/api";
import { applyBrandPreset, applyDensityPreset, applyRadiusPreset } from "@/features/settings/theme";
import { cn } from "@/utils/cn";

/** Super-admin school switcher and admin branch switcher. Shown in the header on tablet/desktop and
 *  at the top of the phone nav drawer, where the header has no room for them. */
export function TenantSwitcher({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const setActiveTenantId = useAuthStore((s) => s.setActiveTenantId);
  const { data: tenants = [] } = useQuery({ queryKey: ["platform", "tenants"], queryFn: listTenants });

  return (
    <Select
      value={activeTenantId}
      onValueChange={async (id) => {
        if (id === activeTenantId) return;
        setActiveTenantId(id);
        // A hard cache clear (not invalidate) is deliberate: this is a tenant isolation boundary,
        // and invalidate would leave the previous tenant's data rendered during the background
        // refetch — exactly the cross-tenant flash this switch must never produce.
        queryClient.clear();
        // Appearance (brand/corner/density) is tenant-scoped too, but lives outside react-query's
        // cache entirely (live CSS variables) — queryClient.clear() alone won't re-paint it, so
        // the newly active tenant's own saved combination has to be fetched and applied here.
        // (Settings > Appearance's own display of these three, if that tab happens to already be
        // open during the switch, is handled separately — SettingsPage keys that tab by
        // activeTenantId so it fully remounts on switch, rather than relying on any react-query
        // refetch timing here.)
        const [brand, radius, density] = await Promise.all([getBrandPreset(), getRadiusPreset(), getDensityPreset()]);
        applyBrandPreset(brand);
        applyRadiusPreset(radius);
        applyDensityPreset(density);
      }}
    >
      <SelectTrigger className={cn("w-64", className)} aria-label="School">
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Select a tenant" />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.schoolName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BranchSwitcher({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveBranchId = useAuthStore((s) => s.setActiveBranchId);
  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches", activeTenantId], queryFn: listBranches });

  return (
    <Select
      value={activeBranchId}
      onValueChange={(id) => {
        if (id === activeBranchId) return;
        setActiveBranchId(id);
        // Same hard cache clear as TenantSwitcher, for the same reason: this is a branch
        // isolation boundary, and invalidate would flash the previous branch's data on screen
        // during the background refetch.
        queryClient.clear();
      }}
    >
      <SelectTrigger className={cn("w-48", className)} aria-label="Branch">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Select a branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
