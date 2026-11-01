import { ExpenseForm } from "./expense-form";
import { useState, useId, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { ReplanEvent } from "@/components/replan-event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeBudgetTotals, formatINR, paiseToRupeeInput, rupeesToPaise } from "@/lib/format";
import type { EventRecord } from "@/lib/types";
import { useEvents } from "@/state/events-context";

function RupeeInput({
  label,
  paise,
  onCommit,
}: {
  label: string;
  paise: number;
  onCommit: (paise: number) => void;
}) {
  const [value, setValue] = useState(paiseToRupeeInput(paise));
  const inputId = useId();
  useEffect(() => setValue(paiseToRupeeInput(paise)), [paise]);

  return (
    <div>
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={inputId}
        inputMode="decimal"
        className="mt-1 w-36 tabular-nums"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = rupeesToPaise(value);
          if (Number.isFinite(next)) onCommit(next);
          else setValue(paiseToRupeeInput(paise));
        }}
      />
    </div>
  );
}

export function BudgetTab({ event }: { event: EventRecord }) {
  const { addExpense, deleteExpense, updateAllocation, updateContingency } = useEvents();
  const totals = computeBudgetTotals(event);

  return (
    <div className="mt-4 space-y-4">
      <ReplanEvent key={event.id} event={event} />
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatINR(totals.spentPaise)} spent of {formatINR(totals.totalBudgetPaise)} planned ·{" "}
        {formatINR(totals.remainingPaise)} remaining
      </p>

      <p className="text-sm tabular-nums">
        {formatINR(totals.allocatedPaise)} allocated including contingency ·{" "}
        {formatINR(totals.totalBudgetPaise - totals.allocatedPaise)} unallocated
      </p>
      {totals.allocatedPaise > totals.totalBudgetPaise && (
        <p role="alert" className="text-sm text-destructive">
          Planned allocations exceed the total budget by{" "}
          {formatINR(totals.allocatedPaise - totals.totalBudgetPaise)}.
        </p>
      )}
      {totals.overspentPaise > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Recorded spending exceeds the total budget by {formatINR(totals.overspentPaise)}.
        </p>
      )}
      {event.budget.categories.map((cat) => {
        const spent = cat.expenses.reduce((s, e) => s + e.amountPaise, 0);
        return (
          <Card key={cat.id}>
            <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-3 sm:flex-row">
              <div>
                <CardTitle className="font-display text-lg">{cat.name}</CardTitle>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {formatINR(spent)} spent of {formatINR(cat.allocatedPaise)} allocated
                </p>
              </div>
              <RupeeInput
                label="Allocated (₹)"
                paise={cat.allocatedPaise}
                onCommit={(next) => updateAllocation(event.id, cat.id, next)}
              />
            </CardHeader>
            <CardContent>
              {cat.expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
              ) : (
                <ul className="divide-y">
                  {cat.expenses.map((expense) => (
                    <li key={expense.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-words text-sm text-foreground">
                        {expense.label}
                      </span>
                      <span className="flex items-center gap-2 text-sm tabular-nums text-foreground">
                        {formatINR(expense.amountPaise)}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete expense ${expense.label}`}
                          onClick={() => deleteExpense(event.id, cat.id, expense.id)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <ExpenseForm
                idPrefix={cat.id}
                onAdd={(label, amountPaise) => addExpense(event.id, cat.id, { label, amountPaise })}
              />
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-3 sm:flex-row">
          <div>
            <CardTitle className="font-display text-lg">{event.budget.contingencyLabel}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Kept aside for surprises — 5% of the total budget by default.
            </p>
          </div>
          <RupeeInput
            label="Amount (₹)"
            paise={event.budget.contingencyPaise}
            onCommit={(next) => updateContingency(event.id, next)}
          />
        </CardHeader>
      </Card>
    </div>
  );
}
