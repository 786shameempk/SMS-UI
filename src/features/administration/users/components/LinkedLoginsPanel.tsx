import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { KeyRound, Link2, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
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

interface LinkedUser {
  userId: string;
  personType: LinkKind;
  personId: string;
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

function LinkRow({
  row,
  users,
  taken,
  guardianLinks,
  onLinked,
}: {
  row: Row;
  users: LoginUser[];
  taken: Map<string, Set<LinkKind>>;
  /** How many guardian records each login is already linked to. */
  guardianLinks: Map<string, number>;
  onLinked: () => void;
}) {
  // Every parent login is offered for a guardian, including ones already linked to other students: one parent covers
  // all their children. Student and staff records still take only logins that are not linked to anything yet.
  const candidates = useMemo(
    () =>
      users.filter((u) => {
        if (!u.roleKey || !row.roles.includes(u.roleKey)) return false;
        if (row.kind === "Guardian") return true;
        return !taken.has(u.id);
      }),
    [users, row.roles, row.kind, taken],
  );
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
          <Combobox
            value={choice === NONE ? null : choice}
            onValueChange={setChoice}
            aria-label={`Login for ${row.label}`}
            placeholder="Choose a login"
            searchPlaceholder="Search by name or email"
            emptyText={candidates.length === 0 ? "No logins with the right role" : "No matching login"}
            className="w-64"
            options={candidates.map((u) => {
              const n = guardianLinks.get(u.id) ?? 0;
              return { value: u.id, label: u.name, hint: n > 0 ? `${u.email} · linked to ${n} student${n === 1 ? "" : "s"}` : u.email };
            })}
          />
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
  const linkedUsers = useQuery({
    queryKey: ["linked-logins", "linked-users"],
    queryFn: () => unwrap(academicHttpClient.get<LinkedUser[]>("api/people/linked-users")),
  });
  const taken = useMemo(() => {
    const map = new Map<string, Set<LinkKind>>();
    for (const l of linkedUsers.data ?? []) {
      const kinds = map.get(l.userId) ?? new Set<LinkKind>();
      kinds.add(l.personType);
      map.set(l.userId, kinds);
    }
    return map;
  }, [linkedUsers.data]);
  const guardianLinks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of linkedUsers.data ?? []) {
      if (l.personType === "Guardian") counts.set(l.userId, (counts.get(l.userId) ?? 0) + 1);
    }
    return counts;
  }, [linkedUsers.data]);
  const loading = person.isLoading || users.isLoading || linkedUsers.isLoading;

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
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {users.isError && <p className="text-sm text-destructive-strong">Couldn't load logins: {(users.error as Error).message}</p>}
        {linkedUsers.isError && <p className="text-sm text-destructive-strong">Couldn't load linked logins: {(linkedUsers.error as Error).message}</p>}
        {!loading && rows.map((row) => (
          <LinkRow
            key={`${row.kind}-${row.personId}-${row.userId}`}
            row={row}
            users={users.data ?? []}
            taken={taken}
            guardianLinks={guardianLinks}
            onLinked={() => {
              void queryClient.invalidateQueries({ queryKey: key });
              void queryClient.invalidateQueries({ queryKey: ["linked-logins", "linked-users"] });
            }}
          />
        ))}
      </CardContent>
    </Card>
  );
}
