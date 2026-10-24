import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { getCurrentBranchId } from "@/utils/tenant";
import { useClassSectionOptions } from "../hooks";
import { listStudents, promoteStudents } from "../api";

export default function PromotionPanel() {
  const { t } = useTranslation("students");
  const queryClient = useQueryClient();
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { classNames, sectionsFor, nextClassName } = useClassSectionOptions(getCurrentBranchId());

  const [fromClass, setFromClass] = useState("");
  const [fromSection, setFromSection] = useState("");
  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const eligible = useMemo(
    () => students.filter((s) => s.status === "active" && s.className === fromClass && s.section === fromSection),
    [students, fromClass, fromSection],
  );

  const promoteMutation = useMutation({
    mutationFn: () => promoteStudents({ fromClass, fromSection, toClass, toSection }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success(t("Promoted {{count}} student(s) to {{className}} - {{section}}", { count: result.promotedCount, className: toClass, section: toSection }));
      setConfirmOpen(false);
      setFromClass("");
      setFromSection("");
      setToClass("");
      setToSection("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not promote students")),
  });

  const handlePickFromClass = (value: string) => {
    setFromClass(value);
    setFromSection("");
    const suggested = nextClassName(value);
    if (suggested) {
      setToClass(suggested);
      setToSection("");
    }
  };

  const sameSection = Boolean(fromSection) && fromClass === toClass && fromSection === toSection;
  const canPromote = fromClass && fromSection && toClass && toSection && !sameSection && eligible.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          {t("Promote students")}
        </CardTitle>
        <CardDescription>{t("Move an entire class-section of active students to the next class for a new academic year.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={fromClass} onValueChange={handlePickFromClass}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("From class")} />
              </SelectTrigger>
              <SelectContent>
                {classNames.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fromSection} onValueChange={setFromSection} disabled={!fromClass}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("Section")} />
              </SelectTrigger>
              <SelectContent>
                {sectionsFor(fromClass).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-2">
            <Select
              value={toClass}
              onValueChange={(value) => {
                setToClass(value);
                setToSection("");
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("To class")} />
              </SelectTrigger>
              <SelectContent>
                {classNames.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={toSection} onValueChange={setToSection} disabled={!toClass}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("Section")} />
              </SelectTrigger>
              <SelectContent>
                {sectionsFor(toClass).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sameSection && <p className="text-sm text-warning-strong">{t("Source and target sections must differ.")}</p>}

        {fromClass && fromSection && (
          <p className="text-sm text-secondary-foreground">
            <Trans
              t={t}
              i18nKey={
                eligible.length > 0
                  ? "<0>{{count}}</0> active student(s) in {{className}} - {{section}} will be promoted."
                  : "<0>{{count}}</0> active student(s) in {{className}} - {{section}} found."
              }
              values={{ count: eligible.length, className: fromClass, section: fromSection }}
              components={[<span className="font-semibold tabular-nums" />]}
            />
          </p>
        )}

        <Button disabled={!canPromote} onClick={() => setConfirmOpen(true)}>
          {t("Promote students")}
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("Promote students")}
        description={t("This will move {{count}} student(s) from {{fromClass}} - {{fromSection}} to {{toClass}} - {{toSection}}.", { count: eligible.length, fromClass, fromSection, toClass, toSection })}
        confirmLabel={t("Promote")}
        submitting={promoteMutation.isPending}
        onConfirm={() => promoteMutation.mutate()}
      />
    </Card>
  );
}
