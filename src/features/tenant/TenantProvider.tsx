import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { getTenantSubdomain } from "@/lib/tenantHost";
import { getTenantProfile, resolveTenant, TenantNotFoundError, type TenantProfile } from "./api";
import { brandingFor, DEFAULT_BRANDING, type TenantBranding } from "./branding";
import TenantNotFoundPage from "./TenantNotFoundPage";

interface TenantContextValue {
  /** What to display: the tenant's profile field by field, School Sphere's defaults for anything unset. */
  branding: TenantBranding;
  /** The subdomain this page was opened on (null on the platform's own hosts). */
  subdomain: string | null;
  profile: TenantProfile | null;
}

const TenantContext = createContext<TenantContextValue>({ branding: DEFAULT_BRANDING, subdomain: null, profile: null });

export const TENANT_BRANDING_QUERY_KEY = ["tenant", "branding"] as const;

/**
 * The single source of tenant identity and branding for the whole app. Before sign-in the school comes from the
 * hostname's subdomain (an unknown one shows "Tenant not found" instead of the app); after sign-in it is the
 * user's own school, read by the server from their token. Components never fetch or default branding themselves.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const subdomain = useMemo(getTenantSubdomain, []);
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const signedIn = useAuthStore((s) => Boolean(s.token));

  const resolved = useQuery({
    queryKey: [...TENANT_BRANDING_QUERY_KEY, "resolve", subdomain],
    queryFn: () => resolveTenant(subdomain!),
    enabled: subdomain !== null,
    staleTime: 5 * 60_000,
    retry: (count, error) => !(error instanceof TenantNotFoundError) && count < 2,
  });

  // Platform users (no school) have no profile of their own; their screens keep School Sphere's branding.
  const own = useQuery({
    queryKey: [...TENANT_BRANDING_QUERY_KEY, "own", tenantId],
    queryFn: getTenantProfile,
    enabled: signedIn && Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const profile = (signedIn && tenantId ? own.data : undefined) ?? resolved.data ?? null;
  const value = useMemo<TenantContextValue>(() => ({ branding: brandingFor(profile), subdomain, profile }), [profile, subdomain]);

  if (subdomain !== null && resolved.error instanceof TenantNotFoundError) {
    return <TenantNotFoundPage subdomain={subdomain} />;
  }
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);

/** The branding to show right now (logo, name, email, contact number), with School Sphere's defaults applied. */
export const useTenantBranding = () => useContext(TenantContext).branding;
