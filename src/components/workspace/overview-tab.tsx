import { BudgetBar } from "@/components/budget-bar";
import { DueLabel, TaskStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { computeBudgetTotals, formatINR } from "@/lib/format";
import type { EventRecord } from "@/lib/types";

export function OverviewTab({ event }: { event: EventRecord }) {
  const totals = computeBudgetTotals(event);
  const maxAllocated = Math.max(...event.budget.categories.map((c) => c.allocatedPaise), 1);
  const upcoming = [...event.tasks]
    .filter((t) => !t.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const doneTasks = event.tasks.filter((t) => t.completed).length;
  const vendors = event.vendorGroups.flatMap((g) => g.items);
  const confirmedVendors = vendors.filter((v) => v.status === "confirmed").length;

  return (
    <div className="mt-4 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total budget", value: formatINR(totals.totalBudgetPaise) },
          { label: "Spent", value: formatINR(totals.spentPaise) },
          { label: "Remaining", value: formatINR(totals.remainingPaise) },
          { label: "Guests", value: String(event.brief.guestCount) },
        ].map((stat) => (
          <Card key={stat.label}>
            <dl className="space-y-2 p-6">
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">{stat.value}</dd>
            </dl>
          </Card>
        ))}
      </div>

      {totals.overspentPaise > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          This event is {formatINR(totals.overspentPaise)} over budget.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Where the budget goes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.budget.categories.map((cat) => (
            <BudgetBar
              key={cat.id}
              label={cat.name}
              allocatedPaise={cat.allocatedPaise}
              spentPaise={cat.expenses.reduce((s, e) => s + e.amountPaise, 0)}
              maxPaise={maxAllocated}
            />
          ))}
          <BudgetBar
            label={event.budget.contingencyLabel}
            allocatedPaise={event.budget.contingencyPaise}
            spentPaise={0}
            maxPaise={maxAllocated}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Next up</CardTitle>
            <CardDescription>
              {doneTasks} of {event.tasks.length} tasks done
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything is done. Enjoy the event!</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((task) => (
                  <li key={task.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {task.category} · <DueLabel iso={task.dueDate} />
                      </p>
                    </div>
                    <TaskStatusBadge task={task} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Vendor progress</CardTitle>
            <CardDescription>
              {confirmedVendors} of {vendors.length} items confirmed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.vendorGroups.map((group) => {
              const confirmed = group.items.filter((i) => i.status === "confirmed").length;
              return (
                <div key={group.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{group.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {confirmed}/{group.items.length}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${group.name} vendor checklist confirmed`}
                    aria-valuemin={0}
                    aria-valuemax={group.items.length || 1}
                    aria-valuenow={confirmed}
                    aria-valuetext={`${confirmed} of ${group.items.length} confirmed`}
                    className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${group.items.length > 0 ? (confirmed / group.items.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
