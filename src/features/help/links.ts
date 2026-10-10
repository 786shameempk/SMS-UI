/** Help Center addresses, so a page never builds a help URL by hand. */
export const helpHome = "/help";
export const articleHref = (id: string) => `/help/a/${id}`;
export const moduleHref = (id: string) => `/help/m/${id}`;
export const roleHref = (role: string) => `/help/r/${role}`;
export const searchHref = (q: string) => `/help?q=${encodeURIComponent(q)}`;

/** The downloadable manual, written to public/help by `npm run help:pdf`. */
export const MANUAL_PDF_URL = "/help/school-sphere-user-manual.pdf";

/** Screenshots are stored in public/help/screenshots and listed in docs/help/assets/screenshots.json. */
export const screenshotUrl = (file: string) => `/help/screenshots/${file}`;
