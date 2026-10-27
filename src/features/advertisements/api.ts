import { authHttpClient, extractApiErrorMessage, resolveFileUrl, AUTH_API_BASE_URL } from "@/lib/httpClient";

export interface CurrentAdvertisement {
  id: string;
  imageUrl: string;
  redirectUrl: string | null;
  autoCloseSeconds: number;
  showCloseButton: boolean;
}

/**
 * The advertisement the signed-in person's school should see on the web home page, or null. The school comes from the sign-in token on the server,
 * so nothing here says whose advertisement to fetch. 204 (nothing configured) and any failure both mean "show nothing".
 */
export async function getCurrentAdvertisement(app: "web"): Promise<CurrentAdvertisement | null> {
  try {
    const res = await authHttpClient.get<CurrentAdvertisement | "">("api/advertisements/current", { params: { app } });
    if (res.status === 204 || !res.data) return null;
    const ad = res.data;
    return { ...ad, imageUrl: resolveFileUrl(ad.imageUrl, AUTH_API_BASE_URL) ?? ad.imageUrl };
  } catch (err) {
    // An advertisement is never worth an error on the home page.
    void extractApiErrorMessage(err);
    return null;
  }
}
