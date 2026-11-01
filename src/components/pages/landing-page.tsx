import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  IndianRupee,
  Lightbulb,
  ListChecks,
  Sparkles,
  Store,
} from "lucide-react";

import { SkipLink } from "@/components/skip-link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: IndianRupee,
    title: "A budget that balances itself",
    description:
      "Your total is split across every category the event needs, with a visible contingency, so overspending shows up early.",
  },
  {
    icon: ListChecks,
    title: "Tasks dated for you",
    description:
      "Each event type comes with a checklist scheduled backwards from the big day — book the venue months out, confirm the caterer days before.",
  },
  {
    icon: Store,
    title: "Vendor tracking that stays honest",
    description:
      "A checklist of what to find and what to ask, moving from “needed” to “confirmed” — no fabricated businesses, just a clear path.",
  },
  {
    icon: Lightbulb,
    title: "Ideas with transparent estimates",
    description:
      "Costed suggestions you can save into your plan, each with an explanation and an illustrative price range to validate with vendors.",
  },
] as const;

export function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Eventora AI</span>
        </span>
        <Button asChild variant="outline">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <section className="rounded-3xl border bg-card px-6 py-14 text-center sm:px-12 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            Weddings · Birthdays · Community events
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Plan your next celebration without the chaos
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Describe the event in a short brief and get a working plan in seconds — a balanced
            budget, a dated checklist, a vendor tracker and costed ideas you can save.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/create">
                Start planning
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">See sample events</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Start with three template samples. Browser drafts stay on this device; sign in to save
            private plans and request AI suggestions.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Everything a planner actually juggles
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border bg-card p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border bg-secondary px-6 py-10 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-secondary-foreground">
            Three sample events are waiting
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-secondary-foreground/80">
            A Jaipur wedding, a Pune birthday party and a Bengaluru winter mela — each with its own
            budget, checklist and vendor plan. Open the dashboard to explore them.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/dashboard">
              Open the dashboard
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
