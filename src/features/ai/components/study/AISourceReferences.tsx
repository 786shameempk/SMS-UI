import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StudySource } from "../../study/types";

/** The school documents (and pages) an answer was based on. */
export default function AISourceReferences({ sources }: { sources: StudySource[] }) {
  const { t } = useTranslation("ai");
  if (sources.length === 0) return null;
  return (
    <div className="mt-2 space-y-1" aria-label={t("Sources")}>
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        {t("From your school materials")}
      </p>
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {sources.map((s, i) => (
          <li key={`${s.documentId}-${s.page}`}>
            {t("[{{number}}] {{document}}, page {{page}}", { number: i + 1, document: s.documentName, page: s.page })}
          </li>
        ))}
      </ul>
    </div>
  );
}
