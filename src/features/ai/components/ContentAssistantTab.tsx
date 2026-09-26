import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStudents } from "@/features/students/api";
import { DRAFT_SCENARIO_CONFIG, DRAFT_SCENARIO_OPTIONS } from "../constants";
import { generateDraft } from "../api";
import type { DraftScenario } from "../types";

export default function ContentAssistantTab() {
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const [scenario, setScenario] = useState<DraftScenario>("report_card_comment");
  const [studentId, setStudentId] = useState("");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: generateDraft,
    onSuccess: () => setCopied(false),
  });

  const draft = mutation.data;

  const copyDraft = async () => {
    if (!draft?.body) return;
    try {
      await navigator.clipboard.writeText(draft.subject ? `${draft.subject}\n\n${draft.body}` : draft.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access can fail in some browser contexts; the text is still visible to copy manually
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Content assistant</CardTitle>
          <CardDescription>Drafts a message from a student's real data — always review before sending.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="draft-scenario">What kind of message?</Label>
              <Select value={scenario} onValueChange={(v) => setScenario(v as DraftScenario)}>
                <SelectTrigger id="draft-scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFT_SCENARIO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{DRAFT_SCENARIO_CONFIG[scenario].description}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="draft-student">Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="draft-student">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} · {s.className} - {s.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button disabled={!studentId || mutation.isPending} onClick={() => mutation.mutate({ scenario, studentId })}>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Sparkles className="w-4 h-4" />
            Generate draft
          </Button>

          {draft && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              {draft.notApplicableReason ? (
                <p className="text-sm text-muted-foreground">{draft.notApplicableReason}</p>
              ) : (
                <>
                  {draft.subject && <p className="text-sm font-semibold text-foreground">{draft.subject}</p>}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{draft.body}</p>
                  <Button variant="outline" size="sm" onClick={copyDraft}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
