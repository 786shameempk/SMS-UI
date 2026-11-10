import { useTranslation } from "react-i18next";
import { BookOpen, Bus, ClipboardCheck, CreditCard, FileText, GraduationCap, Landmark, Package, School, UserCheck, UserPlus, Users, Wallet, BedDouble, Library } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/utils/cn";
import type { DatasetDescriptor } from "../types";

const ICONS: Record<string, LucideIcon> = {
  students: GraduationCap,
  parents: Users,
  staff: UserCheck,
  teachers: School,
  academic: BookOpen,
  attendance: ClipboardCheck,
  exams: FileText,
  admissions: UserPlus,
  fees: CreditCard,
  "fee-balances": Wallet,
  "fee-payments": CreditCard,
  finance: Landmark,
  payroll: Wallet,
  transport: Bus,
  hostel: BedDouble,
  library: Library,
  store: Package,
};

interface Props {
  datasets: DatasetDescriptor[];
  selected: string | null;
  onSelect: (key: string) => void;
  locked?: boolean;
}

/** Step 1: which module's data the report reads. Only modules the school has and this role may use are offered. */
export default function SourceStep({ datasets, selected, onSelect, locked }: Props) {
  const { t } = useTranslation("reports");
  if (datasets.length === 0) {
    return <EmptyState title={t("No data sources available")} description={t("Your school's plan or your role doesn't include any module that custom reports can read.")} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">{t("Choose where the report's data comes from")}</h2>
        <p className="text-sm text-muted-foreground">
          {locked ? t("A saved report keeps its data source. To use another one, start a new report.") : t("Pick the module you want to report on. You can add columns from related records in the next step.")}
        </p>
      </div>
      <div role="radiogroup" aria-label={t("Data source")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {datasets.map((d) => {
          const Icon = ICONS[d.key] ?? FileText;
          const on = selected === d.key;
          return (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked && !on}
              onClick={() => onSelect(d.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-card p-4 text-start transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                on && "border-primary bg-accent/40 ring-1 ring-primary/40",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block font-medium">{d.title}</span>
                <span className="block text-sm text-muted-foreground">{d.description}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t("{{count}} columns", { count: d.fields.length })}</span>
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
