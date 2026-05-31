import { useState } from "react";
import { useListRebuttals, useAddRebuttal } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

// Lets the student push back on the app's reading of one reflection. The exchange
// is a persisted thread (it's real data about the person and feeds their portrait),
// and when a push-back is fair the app's reply is marked "Reconsidered".
export function RebuttalThreadView({
  attemptId,
  problemId,
}: {
  attemptId: number;
  problemId: number;
}) {
  const { data, refetch, isLoading } = useListRebuttals(attemptId, problemId, {
    query: { queryKey: ["rebuttals", attemptId, problemId] },
  });
  const addRebuttal = useAddRebuttal();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = data?.items ?? [];
  const hasThread = items.length > 0;

  const send = () => {
    const message = draft.trim();
    if (!message || addRebuttal.isPending) return;
    setError(null);
    addRebuttal.mutate(
      { attemptId, problemId, data: { message } },
      {
        onSuccess: () => {
          setDraft("");
          refetch();
        },
        onError: () =>
          setError("Couldn't send that just now — please try again."),
      },
    );
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      {hasThread && (
        <div className="flex flex-col gap-3 mb-3">
          {items.map((t) => (
            <div key={t.id} className="flex flex-col gap-2">
              <div className="rounded-md bg-secondary/60 border border-secondary-border p-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  You pushed back
                </span>
                <div className="mt-1 text-sm whitespace-pre-wrap">{t.userMessage}</div>
              </div>
              <div className="rounded-md bg-card border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    The app reconsidered
                  </span>
                  {t.revised && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 border border-chart-2/30"
                      data-testid={`badge-revised-${t.id}`}
                    >
                      Reconsidered its reading
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm">
                  <MarkdownRenderer content={t.appResponse} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open || hasThread ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              hasThread
                ? "Keep going — where is it still wrong?"
                : "Disagree with this reading? Say where it's wrong or unfair, and why."
            }
            className="text-sm"
            rows={3}
            data-testid={`textarea-rebuttal-${problemId}`}
            disabled={addRebuttal.isPending}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              onClick={send}
              disabled={!draft.trim() || addRebuttal.isPending}
              data-testid={`button-send-rebuttal-${problemId}`}
            >
              {addRebuttal.isPending ? "Reconsidering…" : "Send"}
            </Button>
            {!hasThread && (
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={addRebuttal.isPending}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="h-9 text-sm"
          onClick={() => setOpen(true)}
          disabled={isLoading}
          data-testid={`button-pushback-${problemId}`}
        >
          Push back on this reading
        </Button>
      )}
    </div>
  );
}
