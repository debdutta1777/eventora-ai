import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { BasicsStep } from "@/components/create-event/basics-step";
import { PreferencesStep } from "@/components/create-event/preferences-step";
import { ReviewStep } from "@/components/create-event/review-step";
import {
  INITIAL,
  validateEventForm,
  briefFromForm,
  type FormState,
  type FormError,
} from "@/lib/event-form";
import { cn } from "@/lib/utils";
import { useEvents } from "@/state/events-context";

export function CreateEvent() {
  const navigate = useNavigate();
  const { createEvent, ready } = useEvents();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<FormError | null>(null);

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

  const goNext = () => {
    const problem = validateEventForm(form, step + 1);
    if (problem) {
      setError(problem);
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const submit = () => {
    const problem = validateEventForm(form, 3);
    if (problem) {
      setError(problem);
      return;
    }
    const event = createEvent(briefFromForm(form));
    navigate({ to: "/events/$eventId", params: { eventId: event.id } });
  };

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
            id="create-event-error"
            role="alert"
            ref={errorSummary}
            tabIndex={-1}
            className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error.message}
          </p>
        )}

        {step === 1 && <BasicsStep form={form} set={set} stepHeading={stepHeading} error={error} />}
        {step === 2 && (
          <PreferencesStep
            form={form}
            set={set}
            stepHeading={stepHeading}
            error={error}
            togglePriority={togglePriority}
          />
        )}
        {step === 3 && <ReviewStep form={form} set={set} stepHeading={stepHeading} error={error} />}

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
