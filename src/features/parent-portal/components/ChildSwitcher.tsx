import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/cn";
import type { Student } from "@/features/students/types";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function ChildSwitcher({
  students,
  selectedId,
  onSelect,
}: {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (students.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {students.map((child) => {
        const active = child.id === selectedId;
        return (
          <button
            key={child.id}
            type="button"
            onClick={() => onSelect(child.id)}
            className={cn(
              "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-colors cursor-pointer",
              active ? "border-brand-300 bg-brand-500/10 shadow-sm" : "border-border bg-card hover:bg-secondary",
            )}
          >
            <Avatar className="w-6 h-6">
              {child.photoUrl && <AvatarImage src={child.photoUrl} alt={child.firstName} />}
              <AvatarFallback className="text-[10px]">{initialsOf(child.firstName, child.lastName)}</AvatarFallback>
            </Avatar>
            <span className={cn("text-sm font-medium", active ? "text-brand-700 dark:text-brand-300" : "text-muted-foreground")}>
              {child.firstName} {child.lastName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
