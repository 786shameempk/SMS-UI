import type { TenantProfile } from "./api";

export const DEFAULT_BRAND_NAME = "School Sphere";

export interface TenantBranding {
  /** The school's name, or "School Sphere" until it has configured one. */
  name: string;
  /** The school's logo, or undefined to show School Sphere's own mark. */
  logoUrl?: string;
  /** Consumers hide these when undefined. */
  email?: string;
  contactNumber?: string;
  address?: string;
  /** True when a school profile is loaded (as opposed to the platform's defaults). */
  isTenant: boolean;
}

export const DEFAULT_BRANDING: TenantBranding = { name: DEFAULT_BRAND_NAME, isTenant: false };

/** Tenant value when present, School Sphere's default when empty - decided per field, never all-or-nothing. */
export function brandingFor(profile: TenantProfile | null | undefined): TenantBranding {
  if (!profile) return DEFAULT_BRANDING;
  return {
    name: profile.schoolName?.trim() || DEFAULT_BRAND_NAME,
    logoUrl: profile.logoUrl?.trim() || undefined,
    email: profile.email?.trim() || undefined,
    contactNumber: profile.contactNumber?.trim() || undefined,
    address: profile.address?.trim() || undefined,
    isTenant: true,
  };
}
