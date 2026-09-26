/** The one tenant this app has always shipped real seed data for. Kept dependency-free (no
 *  store/util imports) so both `store/authStore.ts` and `utils/tenant.ts` can import it without
 *  creating a circular module reference between them. */
export const DEFAULT_TENANT_ID = "tenant-educore";
