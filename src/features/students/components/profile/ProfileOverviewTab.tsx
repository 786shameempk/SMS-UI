import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { uploadStudentPhoto } from "../../api";
import type { Student } from "../../types";

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export default function ProfileOverviewTab({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const photoMutation = useMutation({
    mutationFn: (photoUrl: string | null) => uploadStudentPhoto(student.id, photoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students", student.id] });
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
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-16 h-16">
              {student.photoUrl && <AvatarImage src={student.photoUrl} alt={student.firstName} />}
              <AvatarFallback className="text-base">{initialsOf(student.firstName, student.lastName)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
              aria-label="Change student photo"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {student.className} - {student.section} &middot; Roll {student.rollNumber || "—"}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Admission number</dt>
            <dd className="text-foreground font-medium">{student.admissionNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date of birth</dt>
            <dd className="text-foreground font-medium">
              {new Date(student.dateOfBirth).toLocaleDateString()} ({calculateAge(student.dateOfBirth)} yrs)
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Gender</dt>
            <dd className="text-foreground font-medium capitalize">{student.gender}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Admission date</dt>
            <dd className="text-foreground font-medium">{new Date(student.admissionDate).toLocaleDateString()}</dd>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Address</dt>
            <dd className="text-foreground font-medium">{student.address || "—"}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
