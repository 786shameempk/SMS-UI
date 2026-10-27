import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Megaphone, MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdvertisementFormDialog, { PreviewDialog } from "../components/AdvertisementFormDialog";
import { ConfirmDialog, Pager } from "../components/kit";
import { AD_APPS, deleteAdvertisement, getAdvertisement, listAdvertisements, setAdvertisementActive, type AdApp, type AdDetail, type AdListItem } from "../api/advertisements";
import { dateTime, errorText, useDebounced } from "../helpers";
import { useHasOfficePermission } from "../store";

const STATUS: Record<AdListItem["status"], BadgeVariant> = { Live: "success", Scheduled: "info", Expired: "warning", Inactive: "neutral" };

/** Create, edit, switch on and off, preview and delete the image advertisements shown on the home screen of the web app and the three mobile apps. */
export default function AdvertisementsPage() {
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("advertisements.manage");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [app, setApp] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ ad: AdDetail | null } | null>(null);
  const [previewing, setPreviewing] = useState<{ ad: AdDetail; app: AdApp } | null>(null);
  const [deleting, setDeleting] = useState<AdListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const q = useDebounced(search);

  const list = useQuery({
    queryKey: ["office", "advertisements", q, status, app, page],
    queryFn: () => listAdvertisements({ search: q, status: status === "all" ? undefined : status, app: app === "all" ? undefined : app, page, pageSize: 10 }),
    placeholderData: (prev) => prev,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["office", "advertisements"] });

  const toggle = useMutation({
    mutationFn: (ad: AdListItem) => setAdvertisementActive(ad.id, !ad.isActive),
    onSuccess: (ad) => { toast.success(ad.isActive ? "Advertisement activated." : "Advertisement deactivated."); void invalidate(); },
    onError: (e) => toast.error(errorText(e)),
  });
  const remove = useMutation({
    mutationFn: (ad: AdListItem) => deleteAdvertisement(ad.id),
    onSuccess: () => { toast.success("Advertisement deleted."); setDeleting(null); void invalidate(); },
    onError: (e) => setDeleteError(errorText(e)),
  });
  const open = async (ad: AdListItem, mode: "edit" | "preview") => {
    try {
      const detail = await getAdvertisement(ad.id);
      if (mode === "edit") setEditing({ ad: detail });
      else {
        const first = detail.targets.find((t) => t.enabled && t.imageUrl);
        if (first) setPreviewing({ ad: detail, app: first.app });
        else toast.error("Turn on an application and upload an image first.");
      }
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const data = list.data;
  const previewTarget = previewing?.ad.targets.find((t) => t.app === previewing.app);

  return (
    <PageContainer>
      <PageHeader
        icon={Megaphone}
        title="Advertisement Banner Configuration"
        description="Image banners shown once on the home screen of the web app and each mobile app, for all schools or only the ones you choose."
        actions={
          canManage && (
            <Button onClick={() => setEditing({ ad: null })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New advertisement
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search advertisements" placeholder="Search by name" className="w-64" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="live">Live now</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={app} onValueChange={(v) => { setApp(v); setPage(1); }}>
          <SelectTrigger className="w-72" aria-label="Filter by application"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any application</SelectItem>
            {AD_APPS.map((a) => <SelectItem key={a.app} value={a.app}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {list.isLoading && <Skeleton className="h-64 w-full" />}
      {list.isError && <ErrorState description={errorText(list.error)} onRetry={() => void list.refetch()} />}
      {data && data.items.length === 0 && <EmptyState icon={Megaphone} title="No advertisements" description={canManage ? "Create one to show an image on the home screen of an app." : "Nothing has been configured yet."} />}
      {data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Schools</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell className="font-medium">{ad.name}</TableCell>
                  <TableCell><Badge variant={STATUS[ad.status]}>{ad.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {ad.targets.filter((t) => t.enabled).map((t) => <Badge key={t.app} variant="brand">{t.app}</Badge>)}
                      {!ad.targets.some((t) => t.enabled) && <span className="text-xs text-muted-foreground">None on</span>}
                    </div>
                  </TableCell>
                  <TableCell>{ad.tenantMode === "All" ? "All schools" : `${ad.tenantCount} selected`}</TableCell>
                  <TableCell className="tabular-nums">{ad.priority}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ad.startsAt || ad.endsAt ? `${ad.startsAt ? dateTime(ad.startsAt) : "Any time"} to ${ad.endsAt ? dateTime(ad.endsAt) : "no end"}` : "Always"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${ad.name}`}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => void open(ad, "preview")}><Eye className="h-4 w-4" aria-hidden="true" />Preview</DropdownMenuItem>
                        {canManage && (
                          <>
                            <DropdownMenuItem onSelect={() => void open(ad, "edit")}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => toggle.mutate(ad)}><Power className="h-4 w-4" aria-hidden="true" />{ad.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => { setDeleteError(null); setDeleting(ad); }}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={data.pageNumber} totalPages={data.totalPages} totalCount={data.totalCount} onPage={setPage} noun="advertisement" />
        </>
      )}

      {editing && (
        <AdvertisementFormDialog
          ad={editing.ad}
          onClose={() => setEditing(null)}
          onSaved={() => { toast.success(editing.ad ? "Advertisement saved." : "Advertisement created."); setEditing(null); void invalidate(); }}
        />
      )}
      {previewing && previewTarget && <PreviewDialog target={{ ...previewTarget, redirectUrl: previewTarget.redirectUrl ?? "", autoCloseSeconds: String(previewTarget.autoCloseSeconds) }} onClose={() => setPreviewing(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete advertisement"
        description={`This permanently deletes "${deleting?.name}", its settings, its school list and its images. This cannot be undone. To stop showing it without deleting, deactivate it instead.`}
        confirmLabel="Delete permanently"
        destructive
        busy={remove.isPending}
        error={deleteError}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </PageContainer>
  );
}
