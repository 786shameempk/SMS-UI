import type { Group, GroupKind } from "../types";
import { GroupHistoryDialog, GroupMembersDialog, GroupSetDialog, ShuffleDialog } from "./GroupDialogs";

/** The group page's four dialogs in one place, so the page only decides which one is open. */
export function GroupDialogs({
  dialog,
  onClose,
  academicYear,
  kind,
  groups,
  viewing,
  onCloseMembers,
  canManage,
}: {
  dialog: "create" | "shuffle" | "history" | null;
  onClose: () => void;
  academicYear: string;
  kind: GroupKind;
  groups: Group[];
  viewing: Group | null;
  onCloseMembers: () => void;
  canManage: boolean;
}) {
  return (
    <>
      <GroupSetDialog open={dialog === "create"} onOpenChange={(o) => !o && onClose()} academicYear={academicYear} defaultKind={kind} />
      <ShuffleDialog open={dialog === "shuffle"} onOpenChange={(o) => !o && onClose()} groups={groups} academicYear={academicYear} kind={kind} />
      <GroupHistoryDialog open={dialog === "history"} onOpenChange={(o) => !o && onClose()} />
      <GroupMembersDialog group={viewing ? (groups.find((g) => g.id === viewing.id) ?? viewing) : null} onOpenChange={(o) => !o && onCloseMembers()} canManage={canManage} />
    </>
  );
}
