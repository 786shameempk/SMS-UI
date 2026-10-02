import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Building2, Globe } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listTenants } from "@/features/platform/api";
import { listBranches } from "@/features/administration/branches/api";
import { getBrandPreset, getDensityPreset, getRadiusPreset } from "@/features/settings/api";
import { applyBrandPreset, applyDensityPreset, applyRadiusPreset } from "@/features/settings/theme";
import { cn } from "@/utils/cn";

/**
 * Wipes every cached result and refetches whatever is on screen, after the active tenant/branch changed.
 * Requests read the scope from the auth store at send time, so the refetches already use the new scope.
 */
function resetForScopeChange(queryClient: QueryClient) {
  queryClient.getMutationCache().clear();
  return queryClient.resetQueries();
}

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
        // Reset (not invalidate) is deliberate: this is a tenant isolation boundary. Reset drops every
        // cached result - so the previous tenant's data is never rendered during the refetch - and, unlike
        // clear(), also refetches the queries currently on screen (header, sidebar) with the new tenant.
        // The page itself remounts on the scope change (AppLayout keys it by tenant + branch).
        void resetForScopeChange(queryClient);
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
        // Same reset as TenantSwitcher, for the same reason: a branch isolation boundary.
        void resetForScopeChange(queryClient);
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
