import { useState } from "react";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";
import { DATE_RANGE_PRESET_OPTIONS, describeDateRange, resolveDateRange, toIsoDate } from "../dateRange";
import type { DashboardDateRange, DateRangePreset } from "../types";

export default function DateRangePicker({
  value,
  onChange,
}: {
  value: DashboardDateRange;
  onChange: (range: DashboardDateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value.preset === "custom");
  const resolved = resolveDateRange(value);
  const [from, setFrom] = useState(value.from ?? toIsoDate(resolved.start));
  const [to, setTo] = useState(value.to ?? toIsoDate(resolved.end));
  const customInvalid = !from || !to || from > to;

  const pickPreset = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange({ preset });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="max-w-[220px] truncate">{describeDateRange(value)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="space-y-0.5">
          {DATE_RANGE_PRESET_OPTIONS.map((option) => {
            const active = option.value === "custom" ? showCustom : !showCustom && value.preset === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => pickPreset(option.value)}
                className={cn(
                  "w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm cursor-pointer transition-colors",
                  active ? "bg-accent text-accent-foreground font-medium" : "text-foreground hover:bg-secondary",
                )}
              >
                {option.label}
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>

        {showCustom && (
          <div className="mt-2 pt-3 border-t border-border space-y-3 px-1 pb-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="range-from" className="text-xs">From</Label>
                <Input id="range-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="range-to" className="text-xs">To</Label>
                <Input id="range-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            {customInvalid && <p className="text-xs text-destructive">Pick a start date on or before the end date.</p>}
            <Button
              size="sm"
              className="w-full"
              disabled={customInvalid}
              onClick={() => {
                onChange({ preset: "custom", from, to });
                setOpen(false);
              }}
            >
              Apply range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
