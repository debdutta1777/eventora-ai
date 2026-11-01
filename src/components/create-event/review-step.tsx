import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StepProps } from "./types";
import { formatINR, rupeesToPaise } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import {
  CONTINGENCY_PCT,
  allocateTemplateBudget,
  DEMO_PLAN_NOTICE,
  getTemplate,
  prepLeadWarning,
} from "@/lib/templates";

export function ReviewStep({ form, stepHeading }: StepProps) {
  const template = getTemplate(form.type);
  const budgetPaise = rupeesToPaise(form.budgetRupees);
  const reviewBudget =
    Number.isSafeInteger(budgetPaise) && budgetPaise > 0
      ? allocateTemplateBudget(form.type, budgetPaise)
      : null;
  const leadWarning = prepLeadWarning(form.type, form.date);
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle ref={stepHeading} tabIndex={-1} className="font-display text-xl">
          Review & create
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-muted-foreground">Event</dt>
            <dd className="min-w-0 break-words font-medium text-foreground">{form.name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="min-w-0 break-words font-medium text-foreground">
              {EVENT_TYPE_LABELS[form.type]}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-muted-foreground">Date & city</dt>
            <dd className="min-w-0 break-words font-medium text-foreground">
              {form.date || "—"}
              {form.city ? `, ${form.city}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-muted-foreground">Guests</dt>
            <dd className="min-w-0 break-words font-medium text-foreground">
              {form.guestCount || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-muted-foreground">Total budget</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {Number.isFinite(budgetPaise) ? formatINR(budgetPaise) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-muted-foreground">Priorities</dt>
            <dd className="min-w-0 break-words font-medium text-foreground">
              {form.priorities.length > 0 ? form.priorities.join(", ") : "—"}
            </dd>
          </div>
        </dl>

        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-sm min-w-0 break-words font-medium text-foreground">
            Here is the plan you will get
          </p>
          <ul
            aria-label="Starter budget allocations"
            className="mt-2 space-y-1 text-sm text-muted-foreground"
          >
            {reviewBudget?.categories.map((cat) => (
              <li key={cat.name} className="flex flex-wrap justify-between gap-3 tabular-nums">
                <span>{cat.name}</span>
                <span>
                  {cat.pct}% · {Number.isFinite(budgetPaise) ? formatINR(cat.allocatedPaise) : "—"}
                </span>
              </li>
            ))}
            <li className="flex flex-wrap justify-between gap-3 tabular-nums">
              <span>Contingency</span>
              <span>
                {CONTINGENCY_PCT}% ·{" "}
                {Number.isFinite(budgetPaise)
                  ? formatINR(reviewBudget?.contingencyPaise ?? 0)
                  : "—"}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Plus {template.tasks.length} dated tasks, {template.vendors.length} vendor checklists
            and {template.ideas.length} costed ideas.
          </p>
          {leadWarning && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
            >
              {leadWarning}
            </p>
          )}
          <p className="mt-3 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            {DEMO_PLAN_NOTICE}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
