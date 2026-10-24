import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast, { ToastBar, Toaster } from "react-hot-toast";
import { X } from "lucide-react";
import App from "./app/App";
import { clearCacheOnUserChange } from "./app/clearCacheOnUserChange";
import { registerServiceWorker } from "./features/meetings/push";
import "./index.css";
import { applyLanguage, storedLanguage } from "./i18n";
import { startOfflinePurge } from "./features/attendance/offline/purge";

// Interface language (and text direction) before the first paint.
void applyLanguage(storedLanguage());

const queryClient = new QueryClient({
  // A failed *background* refresh leaves stale data on screen with no other signal, so say so once.
  // First-load failures are shown in place by each page (DataTable/ErrorState), not as a toast.
  queryCache: new QueryCache({
    onError: (_error, query) => {
      if (query.state.data !== undefined) toast.error("Couldn’t refresh some data. Showing the last saved version.", { id: "query-refresh-error" });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// A different person signing in (or out) never sees the previous person's cached data.
clearCacheOnUserChange(queryClient);

// Names and registers saved on this device for offline attendance belong to whoever is signed in, and go when they leave.
startOfflinePurge();

// Installable PWA + Web Push for class reminders + a cached app shell so the app opens offline (public/sw.js).
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        gutter={8}
        containerStyle={{ top: 16, right: 16 }}
        toastOptions={{
          duration: 3500,
          className: "!rounded-lg !border !border-border !bg-popover !text-popover-foreground !shadow-lg !text-sm !px-3 !py-2.5 !max-w-[380px]",
          success: { iconTheme: { primary: "var(--color-success)", secondary: "var(--color-card)" } },
          error: { duration: 5000, iconTheme: { primary: "var(--color-destructive)", secondary: "var(--color-card)" } },
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== "loading" && (
                  <button
                    type="button"
                    aria-label="Close notification"
                    onClick={() => toast.dismiss(t.id)}
                    className="ms-1 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </QueryClientProvider>
  </StrictMode>,
);
