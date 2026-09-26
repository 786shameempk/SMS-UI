import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquare, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listSystemTemplates, updateSystemTemplate } from "../api";
import type { SystemTemplate, SystemTemplateFormValues } from "../types";
import TemplateEditDialog from "./TemplateEditDialog";

export default function TemplatesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SystemTemplate | null>(null);
  const [open, setOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({ queryKey: ["settings", "templates"], queryFn: listSystemTemplates });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SystemTemplateFormValues }) => updateSystemTemplate(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "audit-log"] });
      toast.success("Template updated");
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update template"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground">
        System-triggered email/SMS content — distinct from Communication Center's ad-hoc broadcast templates.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {template.channel === "email" ? <Mail className="w-4 h-4 text-muted-foreground" /> : <MessageSquare className="w-4 h-4 text-muted-foreground" />}
                  {template.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditing(template);
                    setOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
              {template.subject && <CardDescription>{template.subject}</CardDescription>}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-foreground line-clamp-3">{template.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TemplateEditDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        template={editing}
        submitting={updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
        }}
      />
    </div>
  );
}
