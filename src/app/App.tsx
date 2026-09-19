import { RouterProvider } from "react-router-dom";
import { applyBrandPreset, getStoredBrandPreset } from "@/features/settings/theme";
import { router } from "./router";

// Runs once at module load, before first paint, so the saved brand theme never flashes default.
applyBrandPreset(getStoredBrandPreset());

export default function App() {
  return <RouterProvider router={router} />;
}
