import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { listFeatureToggles, setFeatureToggle } from "../api";

export default function FeatureTogglesTab() {
  const { t } = useTranslation("administration");
  const queryClient = useQueryClient();
  const { data: toggles = [], isLoading } = useQuery({ queryKey: ["admin", "feature-toggles"], queryFn: listFeatureToggles });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setFeatureToggle(id, enabled),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-toggles"] });
      toast.success(updated.enabled ? t("{{name}} enabled", { name: updated.label }) : t("{{name}} disabled", { name: updated.label }));
    },
  });

  const grouped = useMemo(() => {
    const acc: Record<string, typeof toggles> = {};
    for (const toggle of toggles) {
      acc[toggle.module] = acc[toggle.module] ? [...acc[toggle.module], toggle] : [toggle];
    }
    return acc;
  }, [toggles]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("Turn entire features on or off application-wide, independent of who has permission to use them.")}
      </p>
      {Object.entries(grouped).map(([module, items]) => (
        <div key={module} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{module}</p>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {items.map((toggle) => (
                <div key={toggle.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{toggle.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{toggle.description}</p>
                  </div>
                  <Switch
                    checked={toggle.enabled}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: toggle.id, enabled: v })}
                    aria-label={toggle.label}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
