import axios from "axios";
import { AUTH_API_BASE_URL, authHttpClient, resolveFileUrl } from "@/lib/httpClient";

/** A school's public identity. Anything the school has not configured is undefined (clients then show School Sphere's own). */
export interface TenantProfile {
  tenantId: string;
  subdomain: string;
  domain: string;
  schoolName: string;
  logoUrl?: string;
  email?: string;
  contactNumber?: string;
  address?: string;
}

/** Shape of AuthService's TenantBrandingDto. */
interface ApiTenantBranding {
  tenantId: string;
  subdomain: string;
  domain: string;
  schoolName: string;
  logoUrl: string | null;
  email: string | null;
  contactNumber: string | null;
  address: string | null;
}

const clean = (value: string | null | undefined) => value?.trim() || undefined;

const mapBranding = (b: ApiTenantBranding): TenantProfile => ({
  tenantId: b.tenantId,
  subdomain: b.subdomain,
  domain: b.domain,
  schoolName: b.schoolName,
  logoUrl: resolveFileUrl(clean(b.logoUrl), AUTH_API_BASE_URL),
  email: clean(b.email),
  contactNumber: clean(b.contactNumber),
  address: clean(b.address),
});

/** Thrown when no live school owns the subdomain (distinct from the API being unreachable). */
export class TenantNotFoundError extends Error {
  constructor(subdomain: string) {
    super(`No school is registered at "${subdomain}".`);
    this.name = "TenantNotFoundError";
  }
}

/** Public (no token): who owns this subdomain. Plain axios so a stale session can never affect it. */
export async function resolveTenant(subdomain: string): Promise<TenantProfile> {
  try {
    const { data } = await axios.get<ApiTenantBranding>(
      new URL(`api/tenant/resolve/${encodeURIComponent(subdomain)}`, AUTH_API_BASE_URL).toString(),
    );
    return mapBranding(data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) throw new TenantNotFoundError(subdomain);
    throw err;
  }
}

/** The signed-in user's own school, taken from their token on the server. */
export async function getTenantProfile(): Promise<TenantProfile> {
  const { data } = await authHttpClient.get<ApiTenantBranding>("/api/tenant/profile");
  return mapBranding(data);
}
