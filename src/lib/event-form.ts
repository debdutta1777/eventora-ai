import type { EventBrief, EventType } from "./types";
import { dateSchema } from "./schemas";
import { rupeesToPaise, todayISO } from "./format";

export const EVENT_TYPES: EventType[] = ["wedding", "birthday", "community"];

export interface FormState {
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

export const INITIAL: FormState = {
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

export interface FormError {
  field: keyof FormState;
  message: string;
}
export function validateEventForm(
  form: FormState,
  target: number,
  today = todayISO(),
): FormError | null {
  const issue = (field: keyof FormState, message: string) => ({ field, message });
  if (target >= 2) {
    if (form.name.trim().length < 3)
      return issue("name", "Give the event a name (at least 3 characters).");
    if (!dateSchema.safeParse(form.date).success) return issue("date", "Pick a valid event date.");
    if (form.date < today) return issue("date", "The event date must be today or later.");
    if (form.city.trim().length < 2) return issue("city", "Tell us the city.");
    const guests = Number(form.guestCount);
    if (!Number.isSafeInteger(guests) || guests < 1)
      return issue("guestCount", "Guest count must be a whole number of 1 or more.");
    const budget = rupeesToPaise(form.budgetRupees);
    if (!Number.isFinite(budget) || budget <= 0)
      return issue("budgetRupees", "Enter a total budget greater than zero.");
  }
  if (target >= 3 && form.priorities.length === 0)
    return issue("priorities", "Pick at least one priority.");
  return null;
}
export function briefFromForm(form: FormState): EventBrief {
  return {
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
  };
}
