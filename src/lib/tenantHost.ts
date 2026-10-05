/**
 * Multi-tenant hosting: each school opens the one shared app at {subdomain}.{base domain}
 * (greenvalley.sms-schoolsphere.com). The base domain and the subdomains that belong to the platform itself
 * (no school: the marketing "www", the shared demo host...) are resolved like the API URLs: runtime config.js
 * (tenantBaseDomain / platformSubdomains), then VITE_TENANT_BASE_DOMAIN / VITE_PLATFORM_SUBDOMAINS, then defaults.
 */
const runtimeConfig: Partial<Record<string, string>> =
  (typeof window !== "undefined" && (window as Window & { __EDUCORE_CONFIG__?: Record<string, string> }).__EDUCORE_CONFIG__) || {};

export const TENANT_BASE_DOMAIN = (
  runtimeConfig.tenantBaseDomain?.trim() ||
  import.meta.env.VITE_TENANT_BASE_DOMAIN?.trim() ||
  "sms-schoolsphere.com"
).toLowerCase();

const splitList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const PLATFORM_SUBDOMAINS: string[] = (() => {
  const configured = splitList(runtimeConfig.platformSubdomains?.trim() || import.meta.env.VITE_PLATFORM_SUBDOMAINS?.trim());
  return configured.length > 0 ? configured : ["www"];
})();

/** The school subdomain in a hostname, or null for the apex, other domains (localhost, IPs), nested names and platform hosts. */
export function subdomainFromHostname(
  hostname: string,
  baseDomain: string = TENANT_BASE_DOMAIN,
  platformSubdomains: string[] = PLATFORM_SUBDOMAINS,
): string | null {
  const host = hostname.trim().replace(/\.$/, "").toLowerCase();
  const suffix = `.${baseDomain.toLowerCase()}`;
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, -suffix.length);
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(sub)) return null;
  return platformSubdomains.includes(sub) ? null : sub;
}

/** The school this page was opened for, from the browser's hostname; null on the platform's own hosts. */
export function getTenantSubdomain(): string | null {
  return typeof window === "undefined" ? null : subdomainFromHostname(window.location.hostname);
}

/** The full address a school is reached at, e.g. "greenvalley" → "greenvalley.sms-schoolsphere.com". */
export function tenantDomainFor(subdomain: string): string {
  return `${subdomain}.${TENANT_BASE_DOMAIN}`;
}
