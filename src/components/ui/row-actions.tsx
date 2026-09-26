import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** The "⋯" trigger + menu used at the end of table rows and list items. */
export function RowActions({ label = "Row actions", children }: { label?: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} className="text-muted-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
