import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/** Dev-server twin of nginx.conf's /founder rule: serves the standalone public/founder-card.html at /founder. */
function founderPage(): Plugin {
  return {
    name: "founder-page",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && /^\/founder\/?(\?.*)?$/.test(req.url)) req.url = "/founder-card.html";
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), founderPage()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
