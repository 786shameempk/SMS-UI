import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import App from "./app/App";
import { registerServiceWorker } from "./features/meetings/push";
import "./index.css";

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

// Installable PWA + Web Push for class reminders (public/sw.js). No offline caching.
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
      />
    </QueryClientProvider>
  </StrictMode>,
);
