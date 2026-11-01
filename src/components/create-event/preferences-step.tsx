import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StepProps } from "./types";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLANNING_PRIORITIES } from "@/lib/types";
import { getTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

export function PreferencesStep({
  form,
  set,
  stepHeading,
  togglePriority,
  error,
}: StepProps & { togglePriority: (priority: string) => void }) {
  const template = getTemplate(form.type);
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle ref={stepHeading} tabIndex={-1} className="font-display text-xl">
          Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset
          aria-describedby={error?.field === "priorities" ? "create-event-error" : undefined}
        >
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
  );
}
