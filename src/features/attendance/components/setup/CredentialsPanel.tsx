import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { assignCredential, listCredentials, revokeCredential } from "../../methods/api";
import PersonPicker from "../../methods/PersonPicker";
import { formatDateTime } from "../../methods/shared";
import type { CredentialKind, PersonType } from "../../methods/types";

import { useTranslation } from "react-i18next";
/** Cards and biometric terminal user ids, linked to people. The raw number is never stored or shown again. */
export default function CredentialsPanel() {
  const { t } = useTranslation("attendance");
  const queryClient = useQueryClient();
  const credentials = useQuery({ queryKey: ["attendance-methods", "credentials"], queryFn: () => listCredentials() });
  const [personType, setPersonType] = useState<PersonType>("student");
  const [personId, setPersonId] = useState<string | null>(null);
  const [kind, setKind] = useState<CredentialKind>("rfid");
  const [identifier, setIdentifier] = useState("");
  const [filter, setFilter] = useState("");

  const assign = useMutation({
    mutationFn: assignCredential,
    onSuccess: (c) => {
      toast.success(t("{{label}} linked to {{personName}}", { label: c.label, personName: c.personName }));
      setIdentifier("");
      queryClient.invalidateQueries({ queryKey: ["attendance-methods", "credentials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: revokeCredential,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-methods", "credentials"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (credentials.data ?? []).filter((c) => !filter || c.personName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("Link a card or terminal id")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("Tap the card on a USB reader with this field focused, or type the number printed on it. For fingerprint terminals use the user id (PIN) enrolled on the terminal.")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("Person")}</Label>
              <Select
                value={personType}
                onValueChange={(v) => {
                  setPersonType(v as PersonType);
                  setPersonId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t("Student")}</SelectItem>
                  <SelectItem value="staff">{t("Staff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Type")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CredentialKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rfid">{t("RFID card")}</SelectItem>
                  <SelectItem value="biometric">{t("Biometric user id")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <PersonPicker personType={personType} value={personId} onChange={setPersonId} ariaLabel="Person to link" />
          <div className="space-y-1.5">
            <Label htmlFor="cred-id">{kind === "rfid" ? t("Card number / UID") : t("Terminal user id")}</Label>
            <Input id="cred-id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="off" />
          </div>
          <Button
            className="w-full"
            disabled={!personId || identifier.trim().length < 3 || assign.isPending}
            onClick={() => personId && assign.mutate({ personType, personId, kind, identifier })}
          >
            {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {t("Link")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("Linked cards and ids")}</CardTitle>
          <Input className="max-w-[240px]" placeholder={t("Filter by name")} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t("Filter by name")} />
        </CardHeader>
        <CardContent>
          {credentials.isError ? (
            <ErrorState bare onRetry={() => credentials.refetch()} />
          ) : !rows.length ? (
            <EmptyState bare title={t("Nothing linked yet")} />
          ) : (
            <div className="max-h-[520px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {rows.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.personName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.kind === "rfid" ? t("Card") : t("Terminal id")} {t(c.label)} · {c.personType} {t("· linked")} {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <Badge variant="neutral">{c.kind === "rfid" ? t("RFID") : t("Biometric")}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t("Revoke {{label}} for {{personName}}", { label: c.label, personName: c.personName })}
                    onClick={() => {
                      if (window.confirm(`Revoke ${c.label} for ${c.personName}? The card stops working at once.`)) revoke.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
