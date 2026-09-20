import { RouterProvider } from "react-router-dom";
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

// Runs once at module load, before first paint, so no saved appearance setting ever flashes its
// default. Theme mode must apply first: applyBrandPreset reads document.documentElement's
// data-theme to pick a light- or dark-appropriate shade index for --color-primary/--color-ring.
applyThemeMode(getStoredThemeMode());
applyBrandPreset(getStoredBrandPreset());
applyRadiusPreset(getStoredRadiusPreset());
applyDensityPreset(getStoredDensityPreset());

export default function App() {
  return <RouterProvider router={router} />;
}
