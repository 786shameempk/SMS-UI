import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import {
  applyBrandPreset,
  applyDensityPreset,
  applyRadiusPreset,
  applyThemeMode,
  getStoredBrandPreset,
  getStoredDensityPreset,
  getStoredRadiusPreset,
  getStoredThemeMode,
} from "@/features/settings/theme";
import { router } from "./router";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { OverflowTooltip } from "@/components/common/OverflowTooltip";
import { TenantProvider } from "@/features/tenant/TenantProvider";

// Runs once at module load, before first paint, so no saved appearance setting ever flashes its
// default. Theme mode must apply first: applyBrandPreset reads document.documentElement's
// data-theme to pick a light- or dark-appropriate shade index for --color-primary/--color-ring.
applyThemeMode(getStoredThemeMode());
applyBrandPreset(getStoredBrandPreset());
applyRadiusPreset(getStoredRadiusPreset());
applyDensityPreset(getStoredDensityPreset());

export default function App() {
  // reducedMotion="user": every framer-motion animation honours the OS "reduce motion" setting.
  return (
    <MotionConfig reducedMotion="user">
      <TenantProvider>
        <GoogleAnalytics router={router} />
        <Suspense fallback={<div className="min-h-dvh bg-background" />}>
          <RouterProvider router={router} />
        </Suspense>
      </TenantProvider>
      {/* Full text on hover/focus for any label the layout cuts off with "…", app-wide. */}
      <OverflowTooltip />
    </MotionConfig>
  );
}
