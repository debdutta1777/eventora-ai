import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

import { computeBudgetTotals, formatINR, todayISO } from "./format";
import { createEventFromBrief, newId } from "./templates";
import type { EventRecord, VendorStatus } from "./types";

export const SAMPLE_EVENT_IDS = {
  wedding: "sample-wedding",
  birthday: "sample-birthday",
  community: "sample-community",
} as const;

const SAMPLE_OFFSET_DAYS: Record<keyof typeof SAMPLE_EVENT_IDS, number> = {
  wedding: 150,
  birthday: 24,
  community: 45,
};

/** Builds the three labeled sample events. Dates are relative to today. */
export function buildSampleEvents(): EventRecord[] {
  const dateFromOffset = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");

  const wedding = createEventFromBrief({
    name: "Meera & Arjun's wedding",
    type: "wedding",
    date: dateFromOffset(SAMPLE_OFFSET_DAYS.wedding),
    city: "Jaipur",
    guestCount: 250,
    totalBudgetPaise: 1_200_000 * 100,
    priorities: ["Decor", "Food", "Photography"],
    theme: "Pastel garden wedding",
    foodPreference: "Pure vegetarian, North Indian with a live chaat counter",
    accessibility: "Wheelchair ramps at both venues, reserved elder seating",
    notes: "Mehendi on Friday evening, wedding Saturday, reception Sunday lunch.",
  });
  wedding.id = SAMPLE_EVENT_IDS.wedding;
  wedding.isSample = true;
  wedding.sampleOffsetDays = SAMPLE_OFFSET_DAYS.wedding;
  decorateSample(
    wedding,
    [
      {
        category: "Venue",
        expenses: [{ label: "Venue booking advance", amountPaise: 150_000 * 100 }],
      },
      {
        category: "Catering",
        expenses: [{ label: "Menu tasting and advance", amountPaise: 35_000 * 100 }],
      },
      {
        category: "Photography",
        expenses: [{ label: "Booking advance — photography team", amountPaise: 25_000 * 100 }],
      },
    ],
    {
      completed: 2,
      vendorStatuses: { "Review the venue contract for hidden costs": "researching" },
      savedIdeas: 1,
    },
  );

  const birthday = createEventFromBrief({
    name: "Aarav turns 7",
    type: "birthday",
    date: dateFromOffset(SAMPLE_OFFSET_DAYS.birthday),
    city: "Pune",
    guestCount: 40,
    totalBudgetPaise: 60_000 * 100,
    priorities: ["Food", "Entertainment"],
    theme: "Space adventure",
    foodPreference: "Kid-friendly buffet with an eggless space-galaxy cake",
    accessibility: "Ground-floor party hall",
    notes: "Classmates from 4pm, family joins at 6pm for cake cutting.",
  });
  birthday.id = SAMPLE_EVENT_IDS.birthday;
  birthday.isSample = true;
  birthday.sampleOffsetDays = SAMPLE_OFFSET_DAYS.birthday;
  decorateSample(
    birthday,
    [
      { category: "Venue", expenses: [{ label: "Party hall booking", amountPaise: 6_000 * 100 }] },
      {
        category: "Food & cake",
        expenses: [{ label: "Cake order advance", amountPaise: 2_500 * 100 }],
      },
    ],
    { completed: 1, vendorStatuses: {}, savedIdeas: 1 },
  );

  const community = createEventFromBrief({
    name: "Rose Colony winter mela",
    type: "community",
    date: dateFromOffset(SAMPLE_OFFSET_DAYS.community),
    city: "Bengaluru",
    guestCount: 500,
    totalBudgetPaise: 3_00_000 * 100,
    priorities: ["Program", "Guest comfort"],
    theme: "Winter village mela",
    foodPreference: "Resident-run food stalls plus two local vendors",
    accessibility: "Ramped entries, seated rest zones, sign-language interpreter for the opening",
    notes: "Committee approved budget in the October meeting; volunteers from blocks A–D.",
  });
  community.id = SAMPLE_EVENT_IDS.community;
  community.isSample = true;
  community.sampleOffsetDays = SAMPLE_OFFSET_DAYS.community;
  decorateSample(
    community,
    [
      {
        category: "Venue & permissions",
        expenses: [{ label: "Ground reservation fee", amountPaise: 15_000 * 100 }],
      },
    ],
    { completed: 1, vendorStatuses: {}, savedIdeas: 2 },
  );

  return [wedding, birthday, community];
}

type ExpenseSeed = { category: string; expenses: { label: string; amountPaise: number }[] };

function decorateSample(
  event: EventRecord,
  expenseSeeds: ExpenseSeed[],
  options: { completed: number; vendorStatuses: Record<string, VendorStatus>; savedIdeas: number },
): void {
  for (const seed of expenseSeeds) {
    const category = event.budget.categories.find((c) => c.name === seed.category);
    if (!category) continue;
    for (const expense of seed.expenses) {
      category.expenses.push({
        id: newId("exp"),
        label: expense.label,
        amountPaise: expense.amountPaise,
      });
    }
  }

  const incomplete = event.tasks.filter((t) => !t.completed);
  incomplete.slice(-options.completed).forEach((t) => {
    t.completed = true;
  });
  for (const [title, status] of Object.entries(options.vendorStatuses)) {
    for (const group of event.vendorGroups) {
      const item = group.items.find((i) => i.title === title);
      if (item) item.status = status;
    }
  }
  event.ideas.slice(0, options.savedIdeas).forEach((idea) => {
    idea.saved = true;
  });
}

/**
 * Sample events stay useful over time: when a sample event's date has passed,
 * it is re-anchored to today + its offset and its task due dates shift by the
 * same number of days.
 */
export function refreshSampleDates(events: EventRecord[]): EventRecord[] {
  const today = todayISO();
  return events.map((event) => {
    if (!event.isSample || event.sampleOffsetDays === undefined) return event;
    if (event.brief.date >= today) return event;
    const shift = differenceInCalendarDays(parseISO(today), parseISO(event.brief.date));
    const target = format(addDays(new Date(), event.sampleOffsetDays), "yyyy-MM-dd");
    return {
      ...event,
      brief: { ...event.brief, date: target },
      tasks: event.tasks.map((t) => ({
        ...t,
        dueDate: format(addDays(parseISO(t.dueDate), shift), "yyyy-MM-dd"),
      })),
      updatedAt: new Date().toISOString(),
    };
  });
}

/** Small helper for UI copy that quotes money in demo responses. */
export function budgetSummaryLine(event: EventRecord): string {
  const totals = computeBudgetTotals(event);
  return `${formatINR(totals.spentPaise)} spent of ${formatINR(totals.totalBudgetPaise)} planned`;
}
