import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudUpload } from "lucide-react";
import toast from "react-hot-toast";
import * as registry from "@/app/routeRegistry";
import { Button } from "@/components/ui/button";
import { aiHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { buildHelpIndex } from "../../../../scripts/help/lib/ai-index.mjs";
import { helpCatalog } from "../catalog";

interface IndexStatus {
  loaded: boolean;
  revision: string | null;
  appVersion: string | null;
  generatedOn: string | null;
  updatedAt: string | null;
  articles: number;
  chunks: number;
  routes: number;
  tasks: number;
  searchMode: string;
}

const STATUS_KEY = ["help", "ai-index-status"];

/**
 * For the platform administrator: shows which version of the guide Ask School AI is answering from, and publishes this
 * build's guide to it. The service re-checks that the caller is the platform administrator and rejects an invalid index
 * as a whole; this panel only builds the same index the `help:index` script writes.
 */
export default function HelpAdminPanel() {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => (await aiHttpClient.get<IndexStatus>("api/ai/help/index")).data,
    retry: false,
  });

  const publish = useMutation({
    mutationFn: async () => (await aiHttpClient.put<IndexStatus>("api/ai/help/index", buildHelpIndex(helpCatalog, registry))).data,
    onSuccess: (s) => {
      queryClient.setQueryData(STATUS_KEY, s);
      setConfirming(false);
      toast.success(`Guide published to Ask School AI (${s.chunks} sections)`);
    },
    onError: (err) => toast.error(extractApiErrorMessage(err)),
  });

  const current = status.data;
  const upToDate = current?.loaded && current.revision === helpCatalog.revision;

  return (
    <section aria-labelledby="help-admin-heading" className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 id="help-admin-heading" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <CloudUpload className="h-4 w-4 text-primary-text" aria-hidden="true" />
        Ask School AI guide
      </h2>
      <p className="text-sm text-muted-foreground">
        {status.isError
          ? "The AI service could not be reached, so the loaded guide cannot be shown."
          : status.isLoading
            ? "Checking the loaded guide…"
            : current?.loaded
              ? `Loaded: revision ${current.revision} (${current.articles} articles, ${current.chunks} sections).`
              : "No guide is loaded yet, so Ask School AI cannot answer how-to questions from the guide."}{" "}
        This build has revision {helpCatalog.revision}.{upToDate ? " They match." : ""}
      </p>
      {confirming ? (
        <div role="alertdialog" aria-label="Publish the guide?" className="space-y-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning-strong">
          <p>This replaces the guide for every school. Drafts are included and marked as drafts.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" loading={publish.isPending} onClick={() => publish.mutate()}>
              Publish
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={publish.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" onClick={() => setConfirming(true)} disabled={upToDate}>
          Publish guide to Ask School AI
        </Button>
      )}
    </section>
  );
}
