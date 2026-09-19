import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { BRAND_PRESET_OPTIONS } from "../constants";
import { getBrandPreset, updateBrandPreset } from "../api";
import { BRAND_PRESETS } from "../theme";

export default function BrandingTab() {
  const queryClient = useQueryClient();
  const { data: preset, isLoading } = useQuery({ queryKey: ["settings", "brand-preset"], queryFn: getBrandPreset });

  const applyMutation = useMutation({
    mutationFn: updateBrandPreset,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["settings", "brand-preset"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });
      toast.success(`Theme switched to ${BRAND_PRESETS[updated].label}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not change theme"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Brand theme</CardTitle>
        <CardDescription>Applies instantly across the whole portal — sidebar, buttons, badges, everything that uses the brand color.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BRAND_PRESET_OPTIONS.map((option) => {
            const isActive = preset === option.value;
            const shades = BRAND_PRESETS[option.value].shades;
            return (
              <button
                key={option.value}
                type="button"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate(option.value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer disabled:opacity-50",
                  isActive ? "border-primary ring-2 ring-ring" : "border-border hover:bg-secondary/50",
                )}
              >
                <span className="relative w-9 h-9 rounded-full shrink-0" style={{ backgroundColor: shades[500] }}>
                  {isActive &&
                    (applyMutation.isPending && applyMutation.variables === option.value ? (
                      <Loader2 className="w-4 h-4 text-white absolute inset-0 m-auto animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                    ))}
                </span>
                <span className="text-sm font-medium text-slate-800">{option.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
