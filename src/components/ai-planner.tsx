import { useCallback, useEffect, useState } from "react";
import { useEvents } from "@/state/events-context";
import { eventFingerprint } from "@/lib/cloud/events-repository";
import {
  applyAIPlan,
  listAIPlans,
  readAIPlan,
  requestAIPlan,
  type ClientPlanRun,
} from "@/lib/ai/client";
import type { EventRecord } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Idempotency identifiers are generated locally; authorization always comes from the user JWT. */
function requestKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const failureMessage = (code: string | null) =>
  code === "provider_timeout"
    ? "AI planning timed out. Your current plan is unchanged."
    : code === "generation_expired"
      ? "Generation did not finish in time. You can request a fresh proposal."
      : "The proposal could not be generated or validated. Your current plan is unchanged; please try again later.";

export function AIPlanner({ event }: { event: EventRecord }) {
  const { mode, getSaveState, getRevision, acceptAIResult } = useEvents();
  const [instruction, setInstruction] = useState(
    "Use my theme, food preferences, accessibility needs and priorities to suggest a practical plan.",
  );
  const [run, setRun] = useState<ClientPlanRun | null>(null);
  const [history, setHistory] = useState<ClientPlanRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [polling, setPolling] = useState(true);
  const loadHistory = useCallback(async () => {
    if (mode !== "account") return;
    try {
      setHistory(await listAIPlans(event.id));
    } catch {
      setError("Previous proposals could not be loaded. Your current event is unchanged.");
    }
  }, [event.id, mode]);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);
  const runId = run?.id;
  const runStatus = run?.status;
  useEffect(() => {
    if (!runId || runStatus !== "generating" || !polling) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    const poll = async () => {
      try {
        const next = await readAIPlan(runId);
        if (cancelled) return;
        setRun(next);
        if (next.status !== "generating") {
          void loadHistory();
          return;
        }
        if (++count >= 60) {
          setPolling(false);
          setNotice(
            "Generation is taking longer than expected. Use Refresh proposals to recover its status.",
          );
          return;
        }
        timer = setTimeout(() => void poll(), 2000);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not check generation status. Refresh proposals to recover.",
          );
          setPolling(false);
        }
      }
    };
    timer = setTimeout(() => void poll(), 1000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, runStatus, polling, loadHistory]);
  const baseline = run?.base_record;
  const proposed = run?.proposed_record;
  const stale =
    !!run &&
    (run.base_revision !== getRevision(event.id) ||
      eventFingerprint(event) !== eventFingerprint(run.base_record));
  const canGenerate =
    mode === "account" &&
    getSaveState(event.id) === "saved" &&
    !!getRevision(event.id) &&
    instruction.trim().length > 0;
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="font-display text-xl">AI planning assistant</CardTitle>
        <p className="text-sm text-muted-foreground">
          Get a personalized budget, preparation tasks, vendor checklist and ideas. Review the
          proposal before changing your saved plan.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode !== "account" ? (
          <p className="rounded-lg border p-3 text-sm">
            Sign in and save an event to use live AI planning. The browser demo uses templates.
          </p>
        ) : (
          getSaveState(event.id) !== "saved" && (
            <p className="rounded-lg border p-3 text-sm">
              Save your event to account before generating or applying a proposal.
            </p>
          )
        )}
        <div className="space-y-2">
          <Label htmlFor="ai-instruction">What matters for this plan?</Label>
          <Textarea
            id="ai-instruction"
            maxLength={1500}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "Prioritize an accessible guest experience.",
            "Suggest a practical rain contingency.",
            "Make the celebration personal while keeping costs realistic.",
          ].map((text) => (
            <Button
              type="button"
              size="sm"
              variant="outline"
              key={text}
              onClick={() => setInstruction(text)}
            >
              {text}
            </Button>
          ))}
        </div>
        <Button
          disabled={!canGenerate || busy || (run?.status === "generating" && polling)}
          onClick={async () => {
            setBusy(true);
            setError("");
            setNotice("");
            setRun(null);
            try {
              const result = await requestAIPlan(
                event.id,
                getRevision(event.id)!,
                instruction.trim(),
                requestKey(),
              );
              setRun(result);
              setPolling(true);
              void loadHistory();
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not start planning. Your saved event is unchanged.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Preparing request…" : "Generate AI proposal"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Existing expenses, completed work and saved ideas are preserved. Prices are estimates, not
          vendor quotes. Generation attempts are limited to 10 per rolling 24 hours.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
        {run?.status === "generating" && (
          <p role="status" className="text-sm">
            Generating and validating all four planning sections… You can leave this tab and recover
            the proposal from history.
          </p>
        )}
        {run?.status === "failed" && (
          <p role="alert" className="text-sm text-destructive">
            {failureMessage(run.error_code)}
          </p>
        )}
        {run?.status === "ready" && baseline && proposed && run.proposal && (
          <section
            aria-label="AI proposal review"
            className="space-y-4 rounded-xl border bg-muted/30 p-4"
          >
            <h3 className="font-semibold">Review AI proposal</h3>
            <p className="text-sm">{run.proposal.summary}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Budget allocations before and after applying this proposal
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Current allocation</th>
                    <th scope="col">Proposed allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {baseline.budget.categories.map((c) => (
                    <tr key={c.id}>
                      <th scope="row" className="py-1 font-normal">
                        {c.name}
                      </th>
                      <td>{formatINR(c.allocatedPaise)}</td>
                      <td>
                        {formatINR(
                          proposed.budget.categories.find((next) => next.id === c.id)
                            ?.allocatedPaise ?? 0,
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="font-normal">
                      Contingency
                    </th>
                    <td>{formatINR(baseline.budget.contingencyPaise)}</td>
                    <td>{formatINR(proposed.budget.contingencyPaise)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Additional preparation tasks</h4>
              {!proposed.tasks.some((t) => !baseline.tasks.some((old) => old.id === t.id)) && (
                <p className="text-sm text-muted-foreground">
                  No additional tasks. Your existing preparation tasks are preserved.
                </p>
              )}
              <ul className="list-disc pl-5 text-sm">
                {proposed.tasks
                  .filter((t) => !baseline.tasks.some((old) => old.id === t.id))
                  .map((t) => (
                    <li key={t.id}>
                      {t.dueDate}: {t.title}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Additional vendor checklists</h4>
              <ul className="list-disc pl-5 text-sm">
                {proposed.vendorGroups
                  .filter((g) => !baseline.vendorGroups.some((old) => old.id === g.id))
                  .map((g) => (
                    <li key={g.id}>
                      {g.name}: {g.items.map((i) => `${i.title} — ${i.note}`).join("; ")}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Personalized ideas</h4>
              {!proposed.ideas.some((i) => !baseline.ideas.some((old) => old.id === i.id)) && (
                <p className="text-sm text-muted-foreground">
                  No additional ideas. Your existing ideas and saved choices are preserved.
                </p>
              )}
              {proposed.ideas
                .filter((i) => !baseline.ideas.some((old) => old.id === i.id))
                .map((i) => (
                  <div key={i.id} className="mt-2 text-sm">
                    <p className="font-medium">
                      {i.title} · {i.costRangeLabel}
                    </p>
                    <p>{i.explanation}</p>
                    <ol className="list-decimal pl-5">
                      {i.steps.map((step, n) => (
                        <li key={n}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
            <div>
              <h4 className="text-sm font-semibold">Assumptions and warnings</h4>
              <ul className="list-disc pl-5 text-sm">
                {[
                  ...(proposed.aiPlan?.assumptions ?? []),
                  ...(proposed.aiPlan?.warnings ?? []),
                ].map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
            {stale && (
              <p role="alert" className="text-sm text-destructive">
                The event changed after this proposal. Save your current work and generate a fresh
                proposal.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy || stale || getSaveState(event.id) !== "saved"}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = await applyAIPlan(run.id);
                    const accepted = acceptAIResult(result, eventFingerprint(baseline));
                    setRun({ ...run, status: "applied" });
                    setNotice(
                      accepted
                        ? "AI proposal applied and saved to your account."
                        : "The proposal was saved remotely, but newer local edits were kept. Copy your edits before reloading account data.",
                    );
                    void loadHistory();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not apply this proposal. Your local work is still here.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Apply proposal
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setRun(null)}>
                Discard preview
              </Button>
            </div>
          </section>
        )}
        {mode === "account" && (
          <section className="space-y-2" aria-label="Proposal history">
            <Button variant="ghost" size="sm" onClick={() => void loadHistory()}>
              Refresh proposals
            </Button>
            {history.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm"
              >
                <span>
                  {item.status} · revision {item.base_revision} ·{" "}
                  {new Date(item.created_at).toLocaleString()}
                </span>
                {(item.status === "ready" ||
                  item.status === "generating" ||
                  item.status === "failed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRun(item);
                      setPolling(true);
                      setError("");
                      setNotice("");
                    }}
                  >
                    Open proposal
                  </Button>
                )}
              </div>
            ))}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
