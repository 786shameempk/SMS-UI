import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { KeyRound, Link2, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { academicHttpClient, authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";

/**
 * Connects a student / guardian / staff record (AcademicService) to the login that signs in as them
 * (AuthService). Online Classes needs this link to know who may join "Class 5A" and which parent sees
 * which child's classes. Admin-only on both services.
 */

type LinkKind = "Student" | "Guardian" | "Staff";

interface LoginUser {
  id: string;
  name: string;
  email: string;
  roleKey: string | null;
}

interface RawPerson {
  id: string;
  userId: string | null;
  email?: string | null;
  guardians?: Array<{ id: string; name: string; relation: string; email: string | null; userId: string | null }>;
}

interface Row {
  kind: LinkKind;
  personId: string;
  label: string;
  hint: string;
  userId: string | null;
  email: string | null;
  roles: string[];
}

const ROLES_FOR: Record<LinkKind, string[]> = {
  Student: ["student"],
  Guardian: ["parent"],
  Staff: ["teacher", "principal", "accountant", "librarian", "receptionist", "admin"],
};

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const NONE = "__none__";

function LinkRow({ row, users, onLinked }: { row: Row; users: LoginUser[]; onLinked: () => void }) {
  const candidates = useMemo(() => users.filter((u) => u.roleKey && row.roles.includes(u.roleKey)), [users, row.roles]);
  const linked = users.find((u) => u.id === row.userId);
  // Preselect the login whose email matches the record - the usual case, one click to confirm.
  const suggested = candidates.find((u) => row.email && u.email.toLowerCase() === row.email.toLowerCase());
  const [choice, setChoice] = useState<string>(suggested?.id ?? NONE);

  const save = useMutation({
    mutationFn: (userId: string | null) =>
      unwrap(academicHttpClient.put(`api/people/${row.kind}/${row.personId}/user`, { userId })),
    onSuccess: (_, userId) => {
      toast.success(userId ? "Login linked" : "Login unlinked");
      onLinked();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{row.label}</p>
        <p className="text-xs text-muted-foreground">
          {row.userId ? (
            <>Signs in as <strong>{linked ? `${linked.name} (${linked.email})` : "a login that no longer exists"}</strong></>
          ) : (
            row.hint
          )}
        </p>
      </div>
      {row.userId ? (
        <Button size="sm" variant="outline" onClick={() => save.mutate(null)} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />} Unlink
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={choice} onValueChange={setChoice}>
            <SelectTrigger className="h-9 w-56" aria-label={`Login for ${row.label}`}><SelectValue placeholder="Choose a login" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Choose a login…</SelectItem>
              {candidates.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.email}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => save.mutate(choice)} disabled={choice === NONE || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Link
          </Button>
        </div>
      )}
    </div>
  );
}

export default function LinkedLoginsPanel({ kind, personId }: { kind: "student" | "staff"; personId: string }) {
  const queryClient = useQueryClient();
  const key = ["linked-logins", kind, personId];
  const person = useQuery({
    queryKey: key,
    queryFn: () => unwrap(academicHttpClient.get<RawPerson>(kind === "student" ? `api/students/${personId}` : `api/staff/${personId}`)),
  });
  const users = useQuery({
    queryKey: ["linked-logins", "users"],
    queryFn: () => unwrap(authHttpClient.get<LoginUser[]>("/api/school-users")),
    staleTime: 60_000,
  });

  const rows: Row[] = useMemo(() => {
    const p = person.data;
    if (!p) return [];
    if (kind === "staff") {
      return [{ kind: "Staff", personId: p.id, label: "Staff login", hint: "Not linked - they can't host or join online classes yet.", userId: p.userId, email: p.email ?? null, roles: ROLES_FOR.Staff }];
    }
    return [
      { kind: "Student", personId: p.id, label: "Student login", hint: "Not linked - this student can't join online classes yet.", userId: p.userId, email: null, roles: ROLES_FOR.Student },
      ...(p.guardians ?? []).map((g) => ({
        kind: "Guardian" as const,
        personId: g.id,
        label: `${g.name} (${g.relation.toLowerCase()})`,
        hint: "Not linked - won't get parent meeting invites or see this child's classes.",
        userId: g.userId,
        email: g.email,
        roles: ROLES_FOR.Guardian,
      })),
    ];
  }, [person.data, kind]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Login accounts</CardTitle>
        <CardDescription>Links this record to the login that signs in as them. Online classes use it to decide who can join.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {(person.isLoading || users.isLoading) && <p className="text-sm text-muted-foreground">Loading…</p>}
        {users.isError && <p className="text-sm text-destructive-strong">Couldn't load logins: {(users.error as Error).message}</p>}
        {!person.isLoading && !users.isLoading && rows.map((row) => (
          <LinkRow key={`${row.kind}-${row.personId}-${row.userId}`} row={row} users={users.data ?? []} onLinked={() => void queryClient.invalidateQueries({ queryKey: key })} />
        ))}
      </CardContent>
    </Card>
  );
}
