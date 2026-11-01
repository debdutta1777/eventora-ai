import { useId, useState } from "react";
import { replanEvent } from "@/lib/replanning";
import { eventFingerprint } from "@/lib/cloud/events-repository";
import { formatINR, paiseToRupeeInput, rupeesToPaise } from "@/lib/format";
import type { EventRecord } from "@/lib/types";
import { useEvents } from "@/state/events-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReplanEvent({ event }: { event: EventRecord }) {
  const id = useId();
  const { applyReplan, mode, getSaveState } = useEvents();
  const [budget, setBudget] = useState(paiseToRupeeInput(event.brief.totalBudgetPaise));
  const [guests, setGuests] = useState(String(event.brief.guestCount));
  const [locks, setLocks] = useState(
    event.budget.categories.filter((c) => c.locked).map((c) => c.id),
  );
  const [preview, setPreview] = useState<{ record: EventRecord; baseline: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const stale = !!preview && preview.baseline !== eventFingerprint(event);
  const changed = () => {
    setPreview(null);
    setError("");
    setNotice("");
  };
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer font-semibold">Adjust budget and guest count</summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Preview an exact redistribution of your current allocations. Locked categories keep their
        amounts; recorded expenses and existing tasks, vendors and ideas are preserved. This
        calculation does not call AI or assume that vendor prices scale with guest count.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setNotice("");
          try {
            if (!/^\d+$/.test(guests.trim()))
              throw new Error("Enter a positive whole number of guests.");
            setPreview({
              record: replanEvent(event, rupeesToPaise(budget), Number(guests), locks),
              baseline: eventFingerprint(event),
            });
          } catch (err) {
            setPreview(null);
            setError(err instanceof Error ? err.message : "Could not calculate this plan.");
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}-budget`}>New total budget (₹)</Label>
            <Input
              id={`${id}-budget`}
              inputMode="decimal"
              value={budget}
              onChange={(e) => {
                changed();
                setBudget(e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-guests`}>New guest count</Label>
            <Input
              id={`${id}-guests`}
              inputMode="numeric"
              value={guests}
              onChange={(e) => {
                changed();
                setGuests(e.target.value);
              }}
              required
            />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Keep these allocations fixed</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {event.budget.categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={locks.includes(c.id)}
                  onChange={(e) => {
                    changed();
                    setLocks((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((v) => v !== c.id),
                    );
                  }}
                />
                Lock {c.name} ({formatINR(c.allocatedPaise)})
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" variant="outline" disabled={getSaveState(event.id) === "saving"}>
          Preview changes
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {preview && (
        <section aria-label="Replanning preview" className="mt-4 space-y-3">
          <p className="text-sm">
            Budget: {formatINR(event.brief.totalBudgetPaise)} →{" "}
            {formatINR(preview.record.brief.totalBudgetPaise)} · Guests: {event.brief.guestCount} →{" "}
            {preview.record.brief.guestCount}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Current and proposed budget allocations</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Current</th>
                  <th scope="col">Proposed</th>
                </tr>
              </thead>
              <tbody>
                {preview.record.budget.categories.map((c, i) => (
                  <tr key={c.id}>
                    <th scope="row" className="py-1 font-normal">
                      {c.name}
                      {c.locked ? " (locked)" : ""}
                    </th>
                    <td>{formatINR(event.budget.categories[i]!.allocatedPaise)}</td>
                    <td>{formatINR(c.allocatedPaise)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="font-normal">
                    Contingency
                  </th>
                  <td>{formatINR(event.budget.contingencyPaise)}</td>
                  <td>{formatINR(preview.record.budget.contingencyPaise)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Contingency keeps its previous proportion where feasible; with all categories locked,
            any remainder is reserved. Review vendor quotes and quantities for the new guest count.
            Save the changes, then request a fresh AI proposal for updated recommendations. Locks
            also apply to future AI proposals.
          </p>
          {stale && (
            <p role="alert" className="text-sm text-destructive">
              The event changed. Preview again before applying.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={stale || getSaveState(event.id) === "saving"}
              onClick={() => {
                if (applyReplan(preview.record, preview.baseline)) {
                  setPreview(null);
                  setNotice(
                    mode === "account"
                      ? "Changes applied locally. Save to account to keep this version."
                      : "Changes saved in this browser.",
                  );
                } else setError("The event changed or is saving. Preview again before applying.");
              }}
            >
              Apply changes
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Cancel preview
            </Button>
          </div>
        </section>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm">
          {notice}
        </p>
      )}
    </details>
  );
}
