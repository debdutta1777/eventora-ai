import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Plus, RotateCcw, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatISODate, computeBudgetTotals } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { useEvents } from "@/state/events-context";

export function Dashboard() {
  const { events, ready, resetToSamples, mode } = useEvents();

  const totalBudget = events.reduce((s, e) => s + e.brief.totalBudgetPaise, 0);
  const totalSpent = events.reduce((s, e) => s + computeBudgetTotals(e).spentPaise, 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every event you are planning, at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ready && mode === "demo" && events.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="size-4" aria-hidden />
                  Reset demo data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This restores the three sample events with their original budgets and progress,
                    and removes any events you created in this browser. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resetToSamples()}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button asChild>
            <Link to="/create">
              <Plus className="size-4" aria-hidden />
              Create event
            </Link>
          </Button>
        </div>
      </div>

      {!ready ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading your events…</p>
      ) : events.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create your first event and Eventora will build the budget, checklist and vendor plan for you."
            action={
              <Button asChild>
                <Link to="/create">
                  <Plus className="size-4" aria-hidden />
                  Create event
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Events</CardDescription>
                <CardTitle className="font-display text-2xl">{events.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total planned</CardDescription>
                <CardTitle className="font-display text-2xl tabular-nums">
                  {formatINR(totalBudget)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Spent so far</CardDescription>
                <CardTitle className="font-display text-2xl tabular-nums">
                  {formatINR(totalSpent)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <ul className="mt-6 grid gap-4">
            {events.map((event) => {
              const totals = computeBudgetTotals(event);
              const spentPct =
                totals.totalBudgetPaise > 0
                  ? Math.min(100, (totals.spentPaise / totals.totalBudgetPaise) * 100)
                  : 0;
              return (
                <li key={event.id}>
                  <Link
                    to="/events/$eventId"
                    params={{ eventId: event.id }}
                    className="block rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/40"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="min-w-0 break-words font-display text-lg font-semibold text-foreground">
                        {event.brief.name}
                      </h2>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {EVENT_TYPE_LABELS[event.brief.type]}
                      </span>
                      {event.isSample && (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
                          Sample
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden />
                        {formatISODate(event.brief.date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4" aria-hidden />
                        {event.brief.city}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-4" aria-hidden />
                        {event.brief.guestCount} guests
                      </span>
                    </div>
                    <p className="mt-3 text-sm tabular-nums text-foreground">
                      {formatINR(totals.spentPaise)} spent of {formatINR(totals.totalBudgetPaise)}{" "}
                      planned
                      {totals.overspentPaise > 0 && (
                        <span className="ml-2 font-medium text-destructive">
                          {formatINR(totals.overspentPaise)} over
                        </span>
                      )}
                    </p>
                    <div
                      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${event.brief.name}: ${spentPct.toFixed(0)}% of budget spent`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${spentPct}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AppShell>
  );
}
