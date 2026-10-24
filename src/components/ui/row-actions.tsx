import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** The "⋯" trigger + menu used at the end of table rows and list items. */
export function RowActions({ label, children }: { label?: string; children: React.ReactNode }) {
  const { t } = useTranslation("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label ?? t("Row actions")} className="text-muted-foreground pointer-coarse:size-10 data-[state=open]:bg-secondary data-[state=open]:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
