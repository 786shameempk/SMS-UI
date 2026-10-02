import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

/**
 * Unit/component tests (Vitest + React Testing Library on jsdom). Kept apart from vite.config.ts so the
 * production build never loads test tooling.
 *
 * Coverage is measured over all of src/. The 70% gate applies to the logic layers - HTTP client, stores,
 * route guard, utilities, constants, shared layout/table/dialog components and every feature's API adapter -
 * which is where behaviour lives; the whole-app floor only stops it from sliding backwards.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      clearMocks: true,
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/**/types.ts", "src/types/**", "src/**/*.d.ts", "src/main.tsx"],
        reporter: ["text-summary", "html", "lcov", "json-summary", "cobertura"],
        reportsDirectory: "./coverage",
        thresholds: {
          "src/{lib,store,utils,routes}/**": { lines: 70, statements: 70, functions: 70, branches: 60 },
          "src/features/**/api.ts": { lines: 70, statements: 70, functions: 70, branches: 50 },
        },
      },
    },
  }),
);
