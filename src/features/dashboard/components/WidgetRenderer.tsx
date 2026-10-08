import { Suspense } from "react";
import type { DashboardContext } from "../sources/types";
import { HEIGHT_PX } from "../layout";
import { WIDGET_REGISTRY, type WidgetEnv } from "../registry";
import { useDashboardWidget } from "../useDashboard";
import type { DashboardWidgetConfig } from "../widgets";
import type { LayoutItem } from "../layout";
import WidgetShell, { WidgetSkeleton } from "./WidgetShell";

interface Props {
  config: DashboardWidgetConfig;
  item: LayoutItem;
  ctx: DashboardContext;
  env: WidgetEnv;
}

function LoaderWidget({ config, item, ctx, env }: Props) {
  const entry = WIDGET_REGISTRY[config.id];
  if (entry.kind !== "loader") throw new Error(`${config.id} is not a data widget`);
  const query = useDashboardWidget(env.source, entry.key, { enabled: true, ctx, dateRange: env.dateRange, refreshSeconds: config.refreshInterval });
  return (
    <WidgetShell query={query} title={config.name} height={HEIGHT_PX[item.h]} skeleton={entry.skeleton}>
      {(data) => entry.render(data, env)}
    </WidgetShell>
  );
}

/**
 * WidgetRenderer: draws one widget from its catalog config through the registry. Each widget fetches on its
 * own query (hidden widgets are never rendered, so never fetched), and its code loads lazily behind a skeleton.
 */
export default function WidgetRenderer(props: Props) {
  const entry = WIDGET_REGISTRY[props.config.id];
  const fallback = (entry.kind === "loader" && entry.skeleton) || <WidgetSkeleton title={props.config.name} height={HEIGHT_PX[props.item.h]} />;
  return <Suspense fallback={fallback}>{entry.kind === "loader" ? <LoaderWidget {...props} /> : entry.render(props.env)}</Suspense>;
}
