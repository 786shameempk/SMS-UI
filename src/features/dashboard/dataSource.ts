import { useUiStore } from "@/store/useUiStore";

/**
 * Where the dashboard's figures come from: the real services ("live") or built-in sample data ("mock").
 *
 * The product dashboard is always live: there is no Demo option on the page, and the runtime config (config.js, ALLOW_DEMO_DATA
 * in the Docker image) is ignored, so an old deployment setting can never bring back unlabelled sample figures. The sample source
 * (sources/mock.ts) stays for the unit tests, which turn it on with the build-time VITE_ALLOW_DEMO_DATA (see vitest.config.ts).
 */
export type DashboardDataSource = "live" | "mock";

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
  allowDemo: import.meta.env.VITE_ALLOW_DEMO_DATA,
  source: import.meta.env.VITE_DASHBOARD_DATA_SOURCE,
  isDev: false,
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
