import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/** Standalone static pages in public/, served at a clean URL. Keep in step with the matching rules in nginx.conf. */
const STATIC_PAGES: Record<string, string> = {
  founder: "/founder-card.html",
  product: "/schoolsphere.html",
};

/** Dev-server twin of nginx.conf's /founder and /product rules. */
function staticPages(): Plugin {
  return {
    name: "static-pages",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const page = req.url?.match(/^\/([a-z-]+)\/?(\?.*)?$/)?.[1];
        if (page && STATIC_PAGES[page]) req.url = STATIC_PAGES[page];
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), staticPages()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
