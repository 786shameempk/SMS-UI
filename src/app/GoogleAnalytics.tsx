import { useEffect } from "react";
import type { router as appRouter } from "./router";

const MEASUREMENT_ID = "G-H52D8T9BX8";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Loads gtag.js once. Automatic page views are off: this is a single-page app, so they are sent per route change below. */
function loadGtag() {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  // gtag.js expects the arguments object itself in dataLayer, not an array copy.
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

function sendPageView(pathname: string, search: string) {
  window.gtag?.("event", "page_view", {
    page_path: pathname + search,
    page_location: window.location.origin + pathname + search,
    page_title: document.title,
  });
}

/**
 * Google Analytics page views. Rendered next to RouterProvider (not inside it), so it follows the router object
 * directly instead of useLocation(). Production builds only, so local development never reaches the property.
 */
export function GoogleAnalytics({ router }: { router: typeof appRouter }) {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    loadGtag();

    let last = "";
    const track = ({ pathname, search }: { pathname: string; search: string }) => {
      // Search-param updates that keep the page (filters, tabs) count once per distinct URL.
      const key = pathname + search;
      if (key === last) return;
      last = key;
      sendPageView(pathname, search);
    };

    track(router.state.location);
    return router.subscribe((state) => track(state.location));
  }, [router]);

  return null;
}
