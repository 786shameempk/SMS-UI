import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanFace } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { grantFaceConsentForChild, listMyChildrenFaceConsents, withdrawFaceConsentForChild } from "@/features/attendance/methods/api";

import { useTranslation } from "react-i18next";
/**
 * A guardian's own decision about face recognition attendance for this child. Saying yes only allows the school to
 * enrol a photo; saying no (or withdrawing later) deletes any face data the school's face service holds.
 */
export default function FaceConsentCard({ studentId }: { studentId: string }) {
  const { t } = useTranslation("parent-portal");
  const queryClient = useQueryClient();
  const consents = useQuery({ queryKey: ["parent-portal", "face-consents"], queryFn: listMyChildrenFaceConsents, retry: false });
  const mine = consents.data?.find((c) => c.personId === studentId && c.status === "granted");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["parent-portal", "face-consents"] });
  const grant = useMutation({
    mutationFn: () => grantFaceConsentForChild(studentId),
    onSuccess: () => {
      toast.success(t("Consent given"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const withdraw = useMutation({
    mutationFn: () => withdrawFaceConsentForChild(studentId),
    onSuccess: () => {
      toast.success(t("Consent withdrawn. Face data is deleted."));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (consents.isError) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanFace className="h-4 w-4" /> {t("Face recognition attendance")}
        </CardTitle>
        <CardDescription>
          {t("If the school uses face recognition at the gate or in class, your child's attendance can be marked from a photo. Photos go to the school's own face service and are not kept by School Sphere. You can withdraw at any time; the face data is then deleted. Manual attendance always remains available.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {mine ? (
          <>
            <p className="text-sm">
              {t("Consent given on")} {new Date(mine.grantedAt).toLocaleDateString()}
              {mine.enrolled ? t(" · photo enrolled") : t(" · not enrolled yet")}.
            </p>
            <Button variant="destructive-outline" size="sm" onClick={() => window.confirm("Withdraw consent and delete your child's face data?") && withdraw.mutate()} disabled={withdraw.isPending}>
              {t("Withdraw consent")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("No consent given.")}</p>
            <Button size="sm" onClick={() => grant.mutate()} disabled={grant.isPending || consents.isLoading}>
              {t("I agree")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
