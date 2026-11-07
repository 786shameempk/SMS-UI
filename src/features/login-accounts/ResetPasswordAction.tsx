import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { resetUserPassword } from "@/features/administration/users/api";
import { useAuthStore } from "@/store/authStore";
import type { LoginAccountStatus } from "./api";

/** Who sees the reset action at all; the server still checks the Users permission on every reset. */
function useMayResetPasswords(): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return role === "superAdmin" || role === "admin" || role === "principal";
}

/**
 * Whether a password reset can be offered for this person: only when a sign-in account is linked AND that account has an email (a
 * mobile-only account has no password to reset). A person with no linked account, or an account whose methods are unknown, gets none.
 */
export function canResetPassword(userId: string | undefined, status: LoginAccountStatus | undefined): boolean {
  return Boolean(userId && status?.hasEmail);
}

interface ResetTarget {
  userId: string;
  personName: string;
}

/**
 * The confirmation for "Reset password". Render `dialog` once on the page (a row's menu unmounts when it closes, so the dialog can't
 * live inside it) and call `request` from the menu item.
 */
export function useResetPasswordDialog() {
  const { t } = useTranslation("common");
  const [target, setTarget] = useState<ResetTarget | null>(null);
  const reset = useMutation({
    mutationFn: (userId: string) => resetUserPassword(userId),
    onSuccess: () => {
      toast.success(t("Password reset for {{name}}. A temporary password has been emailed.", { name: target?.personName }));
      setTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not reset password")),
  });

  const dialog = (
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && setTarget(null)}
      title={t("Reset password?")}
      description={t("{{name}} will be emailed a temporary password and signed out everywhere. They choose a new password when they next sign in.", {
        name: target?.personName,
      })}
      confirmLabel={t("Reset password")}
      confirmVariant="destructive"
      onConfirm={() => {
        if (target) reset.mutate(target.userId);
      }}
      submitting={reset.isPending}
    />
  );
  return { request: setTarget, dialog };
}

/**
 * "Reset password" for a row's menu. Renders nothing unless the person has a linked, email-based account and the signed-in user may
 * reset passwords. `label` names whose account when a row has two (a student and a parent).
 */
export function ResetPasswordMenuItem({
  userId,
  status,
  personName,
  label,
  onRequest,
}: {
  userId: string | undefined;
  status: LoginAccountStatus | undefined;
  personName: string;
  label?: string;
  onRequest: (target: ResetTarget) => void;
}) {
  const { t } = useTranslation("common");
  const mayReset = useMayResetPasswords();
  if (!mayReset || !userId || !canResetPassword(userId, status)) return null;
  return (
    <DropdownMenuItem onSelect={() => onRequest({ userId, personName })}>
      <KeyRound className="w-3.5 h-3.5" />
      {label ?? t("Reset password")}
    </DropdownMenuItem>
  );
}
