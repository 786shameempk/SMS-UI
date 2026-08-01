import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadStaffPhoto } from "../../api";
import type { StaffMember } from "../../types";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function StaffOverviewTab({ staff }: { staff: StaffMember }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const photoMutation = useMutation({
    mutationFn: (photoUrl: string | null) => uploadStaffPhoto(staff.id, photoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", staff.id] });
      toast.success("Photo updated");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await photoMutation.mutateAsync(dataUrl);
    } catch {
      toast.error("Could not read that image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                {staff.photoUrl && <AvatarImage src={staff.photoUrl} alt={staff.firstName} />}
                <AvatarFallback className="text-base">{initialsOf(staff.firstName, staff.lastName)}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
                aria-label="Change staff photo"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                {staff.firstName} {staff.lastName}
              </p>
              <p className="text-sm text-slate-500">
                {staff.designation} &middot; {staff.department}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Employee ID</dt>
              <dd className="text-slate-800 font-medium">{staff.employeeId}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Joining date</dt>
              <dd className="text-slate-800 font-medium">{new Date(staff.joiningDate).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Date of birth</dt>
              <dd className="text-slate-800 font-medium">{new Date(staff.dateOfBirth).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Phone</dt>
              <dd className="text-slate-800 font-medium">{staff.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Email</dt>
              <dd className="text-slate-800 font-medium">{staff.email}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs text-slate-400">Address</dt>
              <dd className="text-slate-800 font-medium">{staff.address || "—"}</dd>
            </div>
          </dl>

          {staff.resignation && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
              Resigned on {new Date(staff.resignation.resignedAt).toLocaleDateString()} &middot; last working day{" "}
              {new Date(staff.resignation.lastWorkingDate).toLocaleDateString()}
              <p className="text-red-600 mt-1">{staff.resignation.reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promotion history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.promotions.length === 0 && <p className="text-sm text-muted-foreground">No promotions on record.</p>}
          {staff.promotions.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm text-slate-800">
                  <span className="text-slate-500">{p.fromDesignation}</span> &rarr;{" "}
                  <span className="font-medium">{p.toDesignation}</span>
                </p>
                {p.remarks && <p className="text-xs text-slate-500 mt-0.5">{p.remarks}</p>}
              </div>
              <Badge variant="info" className="shrink-0">
                {new Date(p.effectiveDate).toLocaleDateString()}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
