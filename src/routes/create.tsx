import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { dateSchema } from "@/lib/schemas";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR, rupeesToPaise, todayISO } from "@/lib/format";
import {
  CONTINGENCY_PCT,
  allocateTemplateBudget,
  DEMO_PLAN_NOTICE,
  getTemplate,
  prepLeadWarning,
  TYPE_EXAMPLES,
} from "@/lib/templates";
import { EVENT_TYPE_LABELS, PLANNING_PRIORITIES, type EventType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEvents } from "@/state/events-context";

export const Route = createFileRoute("/create")({
  component: CreateEvent,
  head: () => ({
    meta: [
      { title: "Create event — Eventora AI" },
      {
        name: "description",
        content: "Answer a short brief and get a complete plan: budget, tasks, vendors and ideas.",
      },
      { property: "og:title", content: "Create event — Eventora AI" },
      {
        property: "og:description",
        content: "Answer a short brief and get a complete plan: budget, tasks, vendors and ideas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const EVENT_TYPES: EventType[] = ["wedding", "birthday", "community"];

interface FormState {
  name: string;
  type: EventType;
  date: string;
  city: string;
  guestCount: string;
  budgetRupees: string;
  priorities: string[];
  theme: string;
  foodPreference: string;
  accessibility: string;
  notes: string;
}

const INITIAL: FormState = {
  name: "",
  type: "wedding",
  date: "",
  city: "",
  guestCount: "",
  budgetRupees: "",
  priorities: [],
  theme: "",
  foodPreference: "",
  accessibility: "",
  notes: "",
};

export function CreateEvent() {
  const navigate = useNavigate();
  const { createEvent, ready } = useEvents();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const stepHeading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      stepHeading.current?.focus();
    }
  }, [step]);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const validateStep = (target: number): string | null => {
    if (target >= 2) {
      if (form.name.trim().length < 3) return "Give the event a name (at least 3 characters).";
      if (!dateSchema.safeParse(form.date).success) return "Pick the event date.";
      if (form.date < todayISO()) return "The event date must be today or later.";
      if (form.city.trim().length < 2) return "Tell us the city.";
      const guests = Number(form.guestCount);
      if (!Number.isSafeInteger(guests) || guests < 1)
        return "Guest count must be a whole number of 1 or more.";
      const budget = rupeesToPaise(form.budgetRupees);
      if (!Number.isFinite(budget) || budget <= 0) return "Enter a total budget greater than zero.";
    }
    if (target >= 3 && form.priorities.length === 0) return "Pick at least one priority.";
    return null;
  };

  const goNext = () => {
    const problem = validateStep(step + 1);
    if (problem) {
      setError(problem);
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = () => {
    const problem = validateStep(3);
    if (problem) {
      setError(problem);
      return;
    }
    const event = createEvent({
      name: form.name.trim(),
      type: form.type,
      date: form.date,
      city: form.city.trim(),
      guestCount: Number(form.guestCount),
      totalBudgetPaise: rupeesToPaise(form.budgetRupees),
      priorities: [...form.priorities],
      theme: form.theme.trim(),
      foodPreference: form.foodPreference.trim(),
      accessibility: form.accessibility.trim(),
      notes: form.notes.trim(),
    });
    navigate({ to: "/events/$eventId", params: { eventId: event.id } });
  };

  const template = getTemplate(form.type);
  const budgetPaise = rupeesToPaise(form.budgetRupees);
  const reviewBudget =
    Number.isSafeInteger(budgetPaise) && budgetPaise > 0
      ? allocateTemplateBudget(form.type, budgetPaise)
      : null;
  const leadWarning = prepLeadWarning(form.type, form.date);
  const togglePriority = (priority: string) => {
    setForm((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }));
    setError(null);
  };

  return (
    <AppShell>
      <form
        className="mx-auto max-w-2xl"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) goNext();
          else submit();
        }}
      >
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Create an event
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Three short steps and your full plan is ready.
        </p>

        <ol className="mt-6 flex items-center gap-2" aria-label="Progress">
          {["Basics", "Preferences", "Review"].map((label, i) => {
            const n = i + 1;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step > n
                      ? "bg-primary text-primary-foreground"
                      : step === n
                        ? "border-2 border-primary text-primary"
                        : "border border-border text-muted-foreground",
                  )}
                  aria-current={step === n ? "step" : undefined}
                >
                  {step > n ? <Check className="size-3.5" aria-hidden /> : n}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    step >= n ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {n < 3 && <span className="h-px flex-1 bg-border" aria-hidden />}
              </li>
            );
          })}
        </ol>

        {error && (
          <p
            role="alert"
            ref={errorSummary}
            tabIndex={-1}
            className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {step === 1 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle ref={stepHeading} tabIndex={-1} className="font-display text-xl">
                The basics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <fieldset>
                <legend className="text-sm font-medium">What kind of event?</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {EVENT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set("type", type)}
                      aria-pressed={form.type === type}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        form.type === type
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent/40",
                      )}
                    >
                      <span className="block text-sm font-semibold text-foreground">
                        {EVENT_TYPE_LABELS[type]}
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                        {TYPE_EXAMPLES[type].blurb}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="event-name" className="text-sm">
                  Event name
                </Label>
                <Input
                  id="event-name"
                  className="mt-1.5"
                  placeholder="Meera & Arjun's wedding"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="event-date" className="text-sm">
                    Date
                  </Label>
                  <Input
                    id="event-date"
                    type="date"
                    className="mt-1.5"
                    min={todayISO()}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-city" className="text-sm">
                    City
                  </Label>
                  <Input
                    id="event-city"
                    className="mt-1.5"
                    placeholder="Jaipur"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-guests" className="text-sm">
                    Guest count
                  </Label>
                  <Input
                    id="event-guests"
                    type="number"
                    min={1}
                    className="mt-1.5"
                    placeholder="250"
                    value={form.guestCount}
                    onChange={(e) => set("guestCount", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-budget" className="text-sm">
                    Total budget (₹)
                  </Label>
                  <Input
                    id="event-budget"
                    inputMode="decimal"
                    className="mt-1.5"
                    placeholder="1200000"
                    value={form.budgetRupees}
                    onChange={(e) => set("budgetRupees", e.target.value)}
                  />
                </div>
              </div>
              {leadWarning && (
                <p
                  role="alert"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
                >
                  {leadWarning}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle ref={stepHeading} tabIndex={-1} className="font-display text-xl">
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <fieldset>
                <legend className="text-sm font-medium">What matters most?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLANNING_PRIORITIES.map((priority) => {
                    const active = form.priorities.includes(priority);
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => togglePriority(priority)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:bg-accent/40",
                        )}
                      >
                        {priority}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="event-theme" className="text-sm">
                  Theme or vibe
                </Label>
                <Input
                  id="event-theme"
                  className="mt-1.5"
                  placeholder="Pastel garden wedding"
                  value={form.theme}
                  onChange={(e) => set("theme", e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {template.themeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => set("theme", suggestion)}
                      className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground transition-colors hover:bg-accent/70"
                    >
                      <Sparkles className="mr-1 inline size-3" aria-hidden />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="event-food" className="text-sm">
                  Food preference
                </Label>
                <Textarea
                  id="event-food"
                  className="mt-1.5 min-h-20"
                  placeholder="Pure vegetarian, North Indian with a live chaat counter"
                  value={form.foodPreference}
                  onChange={(e) => set("foodPreference", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="event-accessibility" className="text-sm">
                  Accessibility needs
                </Label>
                <Textarea
                  id="event-accessibility"
                  className="mt-1.5 min-h-20"
                  placeholder="Wheelchair ramps, reserved elder seating…"
                  value={form.accessibility}
                  onChange={(e) => set("accessibility", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="event-notes" className="text-sm">
                  Anything else?
                </Label>
                <Textarea
                  id="event-notes"
                  className="mt-1.5 min-h-20"
                  placeholder="Mehendi on Friday evening, wedding Saturday…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
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
                  <dd className="font-medium text-foreground">{form.name || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium text-foreground">{EVENT_TYPE_LABELS[form.type]}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Date & city</dt>
                  <dd className="font-medium text-foreground">
                    {form.date || "—"}
                    {form.city ? `, ${form.city}` : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Guests</dt>
                  <dd className="font-medium text-foreground">{form.guestCount || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Total budget</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {Number.isFinite(budgetPaise) ? formatINR(budgetPaise) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Priorities</dt>
                  <dd className="font-medium text-foreground">
                    {form.priorities.length > 0 ? form.priorities.join(", ") : "—"}
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">Here is the plan you will get</p>
                <ul
                  aria-label="Starter budget allocations"
                  className="mt-2 space-y-1 text-sm text-muted-foreground"
                >
                  {reviewBudget?.categories.map((cat) => (
                    <li key={cat.name} className="flex justify-between gap-3 tabular-nums">
                      <span>{cat.name}</span>
                      <span>
                        {cat.pct}% ·{" "}
                        {Number.isFinite(budgetPaise) ? formatINR(cat.allocatedPaise) : "—"}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-3 tabular-nums">
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
                  Plus {template.tasks.length} dated tasks, {template.vendors.length} vendor
                  checklists and {template.ideas.length} costed ideas.
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
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setError(null);
              setStep((s) => Math.max(1, s - 1));
            }}
            disabled={step === 1}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
          {step < 3 ? (
            <Button type="submit">
              Next
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" disabled={!ready}>
              <Sparkles className="size-4" aria-hidden />
              Create event
            </Button>
          )}
        </div>
      </form>
    </AppShell>
  );
}
