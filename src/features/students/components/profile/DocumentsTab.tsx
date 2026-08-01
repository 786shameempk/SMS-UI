import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOCUMENT_CATEGORIES } from "../../constants";
import { deleteStudentDocument, uploadStudentDocument } from "../../api";
import type { DocumentCategory, Student, StudentDocument } from "../../types";

export default function DocumentsTab({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [deleteTarget, setDeleteTarget] = useState<StudentDocument | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    queryClient.invalidateQueries({ queryKey: ["students", student.id] });
  };

  const uploadMutation = useMutation({
    mutationFn: (doc: { name: string; category: DocumentCategory; fileDataUrl?: string }) =>
      uploadStudentDocument(student.id, doc),
    onSuccess: () => {
      invalidate();
      toast.success("Document uploaded");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => deleteStudentDocument(student.id, documentId),
    onSuccess: () => {
      invalidate();
      toast.success("Document removed");
      setDeleteTarget(null);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await uploadMutation.mutateAsync({ name: file.name, category, fileDataUrl: dataUrl });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const categoryLabel = (value: DocumentCategory) => DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>Birth certificate, transfer certificate, ID proof, and other records on file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload document
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        <div className="space-y-2">
          {student.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
          {student.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  {doc.fileDataUrl ? (
                    <a href={doc.fileDataUrl} download={doc.name} className="text-sm font-medium text-brand-700 hover:underline truncate block">
                      {doc.name}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {categoryLabel(doc.category)} &middot; {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 shrink-0" onClick={() => setDeleteTarget(doc)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete document"
        description={`Remove "${deleteTarget?.name}" from this student's record?`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </Card>
  );
}
