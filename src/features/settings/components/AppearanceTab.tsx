import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Monitor, Moon, Sun } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { useUiStore } from "@/store/useUiStore";
import type { ThemeMode } from "../theme";
import { BRAND_PRESET_OPTIONS, DENSITY_PRESET_OPTIONS, RADIUS_PRESET_OPTIONS } from "../constants";
import { getBrandPreset, getDensityPreset, getRadiusPreset, updateBrandPreset, updateDensityPreset, updateRadiusPreset } from "../api";
import { BRAND_PRESETS, DENSITY_PRESETS, RADIUS_PRESETS } from "../theme";

const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
];

export default function AppearanceTab() {
  const queryClient = useQueryClient();
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);

  const { data: brand, isLoading: brandLoading } = useQuery({ queryKey: ["settings", "brand-preset"], queryFn: getBrandPreset });
  const { data: radius, isLoading: radiusLoading } = useQuery({ queryKey: ["settings", "radius-preset"], queryFn: getRadiusPreset });
  const { data: density, isLoading: densityLoading } = useQuery({ queryKey: ["settings", "density-preset"], queryFn: getDensityPreset });

  const invalidateAudit = () => queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });

  const brandMutation = useMutation({
    mutationFn: updateBrandPreset,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "brand-preset"] });
      invalidateAudit();
      toast.success(`Theme switched to ${BRAND_PRESETS[updated].label}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not change theme"),
  });

  const radiusMutation = useMutation({
    mutationFn: updateRadiusPreset,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "radius-preset"] });
      invalidateAudit();
      toast.success(`Corner style set to ${RADIUS_PRESETS[updated].label}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not change corner style"),
  });

  const densityMutation = useMutation({
    mutationFn: updateDensityPreset,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "density-preset"] });
      invalidateAudit();
      toast.success(`Density set to ${DENSITY_PRESETS[updated].label}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not change density"),
  });

  const isLoading = brandLoading || radiusLoading || densityLoading;
  if (isLoading) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Theme mode</CardTitle>
          <CardDescription>Your own preference for this device — unlike the settings below, this isn't shared with the rest of the school.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_MODE_OPTIONS.map((option) => {
              const isActive = themeMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setThemeMode(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors cursor-pointer",
                    isActive ? "border-primary ring-2 ring-ring" : "border-border hover:bg-secondary/50",
                  )}
                >
                  <option.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand theme</CardTitle>
          <CardDescription>Applies instantly across the whole portal — sidebar, buttons, badges, everything that uses the brand color.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BRAND_PRESET_OPTIONS.map((option) => {
              const isActive = brand === option.value;
              const shades = BRAND_PRESETS[option.value].shades;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={brandMutation.isPending}
                  onClick={() => brandMutation.mutate(option.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer disabled:opacity-50",
                    isActive ? "border-primary ring-2 ring-ring" : "border-border hover:bg-secondary/50",
                  )}
                >
                  <span className="relative w-9 h-9 rounded-full shrink-0" style={{ backgroundColor: shades[500] }}>
                    {isActive &&
                      (brandMutation.isPending && brandMutation.variables === option.value ? (
                        <Loader2 className="w-4 h-4 text-white absolute inset-0 m-auto animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                      ))}
                  </span>
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Corner style</CardTitle>
          <CardDescription>How rounded buttons, cards, and inputs look throughout the portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {RADIUS_PRESET_OPTIONS.map((option) => {
              const isActive = radius === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={radiusMutation.isPending}
                  onClick={() => radiusMutation.mutate(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-colors cursor-pointer disabled:opacity-50",
                    isActive ? "border-primary ring-2 ring-ring" : "border-border hover:bg-secondary/50",
                  )}
                >
                  <span
                    className="w-10 h-10 border-2 border-primary/70 bg-primary/10"
                    style={{ borderRadius: RADIUS_PRESETS[option.value].base }}
                  />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Density</CardTitle>
          <CardDescription>How tightly cards, tables, and lists are spaced.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DENSITY_PRESET_OPTIONS.map((option) => {
              const isActive = density === option.value;
              const rows = option.value === "compact" ? 4 : 3;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={densityMutation.isPending}
                  onClick={() => densityMutation.mutate(option.value)}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-colors cursor-pointer disabled:opacity-50",
                    isActive ? "border-primary ring-2 ring-ring" : "border-border hover:bg-secondary/50",
                  )}
                >
                  <div className="rounded-lg border border-border bg-muted/50 p-1.5 space-y-1">
                    {Array.from({ length: rows }).map((_, i) => (
                      <div key={i} className="h-1.5 rounded-full bg-muted-foreground/30" style={{ width: `${85 - i * 12}%` }} />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
