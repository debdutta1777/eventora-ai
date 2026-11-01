import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StepProps } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayISO } from "@/lib/format";
import { EVENT_TYPES } from "@/lib/event-form";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { prepLeadWarning, TYPE_EXAMPLES } from "@/lib/templates";
import { cn } from "@/lib/utils";

export function BasicsStep({ form, set, stepHeading, error }: StepProps) {
  const leadWarning = prepLeadWarning(form.type, form.date);
  return (
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
            aria-invalid={error?.field === "name"}
            aria-describedby={error?.field === "name" ? "create-event-error" : undefined}
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
              aria-invalid={error?.field === "date"}
              aria-describedby={error?.field === "date" ? "create-event-error" : undefined}
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
              aria-invalid={error?.field === "city"}
              aria-describedby={error?.field === "city" ? "create-event-error" : undefined}
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
              aria-invalid={error?.field === "guestCount"}
              aria-describedby={error?.field === "guestCount" ? "create-event-error" : undefined}
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
              aria-invalid={error?.field === "budgetRupees"}
              aria-describedby={error?.field === "budgetRupees" ? "create-event-error" : undefined}
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
  );
}
