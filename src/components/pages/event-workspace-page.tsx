import { Link } from "@tanstack/react-router";
import { ArrowLeft, ListChecks } from "lucide-react";
import { AIPlanner } from "@/components/ai-planner";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/workspace/overview-tab";
import { BudgetTab } from "@/components/workspace/budget-tab";
import { TasksTab } from "@/components/workspace/tasks-tab";
import { VendorsTab } from "@/components/workspace/vendors-tab";
import { IdeasTab } from "@/components/workspace/ideas-tab";
import { formatISODate } from "@/lib/format";
import { DEMO_PLAN_NOTICE } from "@/lib/templates";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { useEvents } from "@/state/events-context";

export function EventWorkspace({ eventId }: { eventId: string }) {
  const { ready, getEvent, mode, saveEvent, getSaveState } = useEvents();
  const event = getEvent(eventId);

  if (!ready) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading your event…</p>
      </AppShell>
    );
  }

  if (!event) {
    return (
      <AppShell>
        <div className="mt-8">
          <EmptyState
            icon={ListChecks}
            title="Event not found"
            description="This event doesn't exist or was removed. Head back to the dashboard to pick another one."
            action={
              <Button asChild variant="outline">
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Dashboard
      </Link>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            {event.brief.name}
          </h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {EVENT_TYPE_LABELS[event.brief.type]}
          </span>
          {event.isSample && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
              Sample
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatISODate(event.brief.date)} · {event.brief.city} · {event.brief.guestCount} guests
          {event.brief.theme ? ` · ${event.brief.theme}` : ""}
        </p>
      </header>

      {mode === "account" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={getSaveState(event.id) === "saving" || getSaveState(event.id) === "saved"}
            onClick={() => void saveEvent(event.id)}
          >
            {getSaveState(event.id) === "saving" ? "Saving…" : "Save to account"}
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {getSaveState(event.id) === "saved"
              ? "Saved to your account"
              : getSaveState(event.id) === "saving"
                ? "Saving this version…"
                : "Unsaved changes — save before leaving"}
          </p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {event.aiPlan
          ? event.aiPlan.needsRefresh
            ? "AI-assisted plan — budget or guest details changed. Refresh AI suggestions after saving."
            : "AI-assisted plan — estimates require actual vendor quotes."
          : DEMO_PLAN_NOTICE}
      </p>
      {event.aiPlan && (
        <details className="mt-3 rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Plan rationale and assumptions</summary>
          <p className="mt-2">{event.aiPlan.summary}</p>
          <ul className="mt-2 list-disc pl-5">
            {[...event.aiPlan.assumptions, ...event.aiPlan.warnings].map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </details>
      )}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
          <TabsTrigger value="ai">AI Planner</TabsTrigger>
        </TabsList>
        <TabsContent value="ai">
          <AIPlanner key={event.id} event={event} />
        </TabsContent>
        <TabsContent value="overview">
          <OverviewTab event={event} />
        </TabsContent>
        <TabsContent value="budget">
          <BudgetTab event={event} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab event={event} />
        </TabsContent>
        <TabsContent value="vendors">
          <VendorsTab event={event} />
        </TabsContent>
        <TabsContent value="ideas">
          <IdeasTab event={event} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
