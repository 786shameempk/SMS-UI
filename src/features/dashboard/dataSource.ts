import { useUiStore } from "@/store/useUiStore";

/**
 * Where the dashboard's figures come from: the real services ("live") or built-in sample data ("mock").
 *
 * Deployment decides first, resolved like the API addresses in lib/httpClient.ts:
 *   1. runtime config (public/config.js → window.__EDUCORE_CONFIG__, rewritten by the Docker image at start from
 *      ALLOW_DEMO_DATA / DASHBOARD_DATA_SOURCE),
 *   2. build-time VITE_ALLOW_DEMO_DATA / VITE_DASHBOARD_DATA_SOURCE,
 *   3. defaults: demo data allowed only in a development build, live data in production.
 *
 * When demo data is allowed, each browser can flip between the two from the dashboard toolbar (remembered in
 * useUiStore). When it isn't, the dashboard is always live and the switch is hidden - production can never show
 * sample figures by accident.
 */
export type DashboardDataSource = "live" | "mock";

type RuntimeConfig = Partial<Record<string, string>>;
const runtimeConfig: RuntimeConfig =
  (typeof window !== "undefined" && (window as Window & { __EDUCORE_CONFIG__?: RuntimeConfig }).__EDUCORE_CONFIG__) || {};

function setting(runtimeKey: string, buildTime: string | undefined): string | undefined {
  return runtimeConfig[runtimeKey]?.trim() || buildTime?.trim() || undefined;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return /^(1|true|yes|on)$/i.test(value);
}

function parseSource(value: string | undefined): DashboardDataSource | undefined {
  return value === "live" || value === "mock" ? value : undefined;
}

/** Exported for tests; the app uses the resolved constants below. */
export function resolveDataSourceConfig(input: {
  allowDemo?: string;
  source?: string;
  isDev: boolean;
}): { allowDemoData: boolean; defaultSource: DashboardDataSource } {
  const allowDemoData = parseBool(input.allowDemo) ?? input.isDev;
  // Demo data is the default wherever it's allowed (current decision: deployments that allow it run on sample
  // data until the real figures are switched on); production without the allowance is always live.
  const requested = parseSource(input.source) ?? "mock";
  return { allowDemoData, defaultSource: allowDemoData ? requested : "live" };
}

const resolved = resolveDataSourceConfig({
  allowDemo: setting("allowDemoData", import.meta.env.VITE_ALLOW_DEMO_DATA),
  source: setting("dashboardDataSource", import.meta.env.VITE_DASHBOARD_DATA_SOURCE),
  isDev: import.meta.env.DEV,
});

export const ALLOW_DEMO_DATA = resolved.allowDemoData;
export const DEFAULT_DASHBOARD_SOURCE = resolved.defaultSource;

/** The effective source for this browser, and the switch (a no-op when the deployment doesn't allow demo data). */
export function useDashboardDataSource(): {
  source: DashboardDataSource;
  canSwitch: boolean;
  setSource: (source: DashboardDataSource) => void;
} {
  const override = useUiStore((s) => s.dashboardDataSource);
  const setOverride = useUiStore((s) => s.setDashboardDataSource);
  const source = ALLOW_DEMO_DATA ? (override ?? DEFAULT_DASHBOARD_SOURCE) : "live";
  return {
    source,
    canSwitch: ALLOW_DEMO_DATA,
    setSource: (next) => {
      if (ALLOW_DEMO_DATA) setOverride(next === DEFAULT_DASHBOARD_SOURCE ? null : next);
    },
  };
}
