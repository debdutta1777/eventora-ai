import { Circle, IndianRupee, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventRecord } from "@/lib/types";
import { useEvents } from "@/state/events-context";

export function IdeasTab({ event }: { event: EventRecord }) {
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
