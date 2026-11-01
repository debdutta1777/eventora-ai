import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Circle, IndianRupee, ListChecks, Plus, Star, Trash2 } from "lucide-react";
import { useState, useId, useEffect } from "react";

import { dateSchema } from "@/lib/schemas";
import { DEMO_PLAN_NOTICE } from "@/lib/templates";
import { ReplanEvent } from "@/components/replan-event";
import { AIPlanner } from "@/components/ai-planner";
import { AppShell } from "@/components/app-shell";
import { BudgetBar } from "@/components/budget-bar";
import { EmptyState } from "@/components/empty-state";
import { DueLabel, TaskStatusBadge, VendorStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  computeBudgetTotals,
  formatINR,
  formatISODate,
  paiseToRupeeInput,
  rupeesToPaise,
} from "@/lib/format";
import {
  EVENT_TYPE_LABELS,
  TASK_CATEGORIES,
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  type EventRecord,
  type TaskCategory,
  type VendorStatus,
} from "@/lib/types";
import { useEvents } from "@/state/events-store";

export const Route = createFileRoute("/events/$eventId")({
  component: EventWorkspace,
  head: () => ({
    meta: [
      { title: "Event workspace — Eventora AI" },
      {
        name: "description",
        content: "Budget, tasks, vendors and ideas for this event — all in one workspace.",
      },
      { property: "og:title", content: "Event workspace — Eventora AI" },
      {
        property: "og:description",
        content: "Budget, tasks, vendors and ideas for this event — all in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function EventWorkspace() {
  const { eventId } = Route.useParams();
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

/* ============ Overview ============ */

function OverviewTab({ event }: { event: EventRecord }) {
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
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total budget", value: formatINR(totals.totalBudgetPaise) },
          { label: "Spent", value: formatINR(totals.spentPaise) },
          { label: "Remaining", value: formatINR(totals.remainingPaise) },
          { label: "Guests", value: String(event.brief.guestCount) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="font-display text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </dl>

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
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
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

/* ============ Budget ============ */

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

function ExpenseForm({
  idPrefix,
  onAdd,
}: {
  idPrefix: string;
  onAdd: (label: string, amountPaise: number) => void;
}) {
  const [label, setLabel] = useState("");
  const [rupees, setRupees] = useState("");

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const amount = rupeesToPaise(rupees);
        if (!label.trim() || !Number.isFinite(amount) || amount <= 0) return;
        onAdd(label.trim(), amount);
        setLabel("");
        setRupees("");
      }}
    >
      <div className="min-w-40 flex-1">
        <Label htmlFor={`expense-label-${idPrefix}`} className="text-xs text-muted-foreground">
          Expense
        </Label>
        <Input
          id={`expense-label-${idPrefix}`}
          className="mt-1"
          placeholder="Menu tasting"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`expense-amount-${idPrefix}`} className="text-xs text-muted-foreground">
          Amount (₹)
        </Label>
        <Input
          id={`expense-amount-${idPrefix}`}
          inputMode="decimal"
          className="mt-1 w-32 tabular-nums"
          placeholder="5000"
          value={rupees}
          onChange={(e) => setRupees(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" variant="outline">
        <Plus className="size-4" aria-hidden />
        Add
      </Button>
    </form>
  );
}

function BudgetTab({ event }: { event: EventRecord }) {
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
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
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
                      <span className="text-sm text-foreground">{expense.label}</span>
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
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
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

/* ============ Tasks ============ */

function TasksTab({ event }: { event: EventRecord }) {
  const { addTask, toggleTask } = useEvents();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>(TASK_CATEGORIES[0]);
  const [dueDate, setDueDate] = useState(event.brief.date);

  const sorted = [...event.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="mt-4 space-y-4">
      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !dateSchema.safeParse(dueDate).success) return;
          addTask(event.id, { title: title.trim(), category, dueDate });
          setTitle("");
        }}
      >
        <div className="min-w-48 flex-1">
          <Label htmlFor="task-title" className="text-xs text-muted-foreground">
            New task
          </Label>
          <Input
            id="task-title"
            className="mt-1"
            placeholder="Book the DJ"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="task-category" className="text-xs text-muted-foreground">
            Category
          </Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
            <SelectTrigger id="task-category" className="mt-1 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="task-due" className="text-xs text-muted-foreground">
            Due date
          </Label>
          <Input
            id="task-due"
            type="date"
            className="mt-1"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <Button type="submit">
          <Plus className="size-4" aria-hidden />
          Add task
        </Button>
      </form>

      <ul className="divide-y rounded-xl border bg-card">
        {sorted.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <label className="flex min-w-0 items-center gap-3">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(event.id, task.id)}
                aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
              />
              <span
                className={
                  task.completed
                    ? "break-words text-sm text-muted-foreground line-through"
                    : "break-words text-sm text-foreground"
                }
              >
                {task.title}
              </span>
              <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
                {task.category}
              </span>
            </label>
            <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
              <DueLabel iso={task.dueDate} />
              <TaskStatusBadge task={task} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============ Vendors ============ */

function VendorsTab({ event }: { event: EventRecord }) {
  const { setVendorStatus, toggleVendorDone } = useEvents();

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        A checklist of what to arrange — move each item from “needed” to “confirmed”. The notes
        remind you what to check; no businesses are invented here.
      </p>
      {event.vendorGroups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b pb-4 last:border-b-0 last:pb-0"
              >
                <div className="min-w-48 flex-1">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(checked) =>
                        toggleVendorDone(event.id, item.id, checked === true)
                      }
                      aria-label={`Mark ${item.title} as done`}
                    />
                    <span
                      className={
                        item.done
                          ? "text-sm font-medium text-muted-foreground line-through"
                          : "text-sm font-medium text-foreground"
                      }
                    >
                      {item.title}
                    </span>
                  </label>
                  <p className="mt-1 pl-6 text-xs text-muted-foreground">{item.note}</p>
                </div>
                <div className="flex items-center gap-3">
                  <VendorStatusBadge status={item.status} />
                  <Select
                    value={item.status}
                    onValueChange={(v) => setVendorStatus(event.id, item.id, v as VendorStatus)}
                  >
                    <SelectTrigger className="w-36" aria-label={`Status for ${item.title}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {VENDOR_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ============ Ideas ============ */

function IdeasTab({ event }: { event: EventRecord }) {
  const { toggleIdeaSaved } = useEvents();

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {event.ideas.map((idea) => (
        <Card key={idea.id} className={idea.saved ? "border-primary/60" : undefined}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg">{idea.title}</CardTitle>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <IndianRupee className="size-3" aria-hidden />
                  {idea.costRangeLabel}
                </p>
              </div>
              <Button
                variant={idea.saved ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggleIdeaSaved(event.id, idea.id)}
                aria-pressed={idea.saved}
              >
                <Star className="size-4" aria-hidden />
                {idea.saved ? "Saved" : "Save"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{idea.explanation}</p>
            <ol className="mt-3 space-y-1.5 text-sm text-foreground">
              {idea.steps.map((step, i) => (
                <li key={step} className="flex gap-2">
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span>
                    <span className="sr-only">Step {i + 1}: </span>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
