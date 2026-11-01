import { describe, expect, it } from "vitest";

import { addDays, format, parseISO } from "date-fns";

import { computeBudgetTotals, todayISO } from "./format";
import {
  CONTINGENCY_PCT,
  allocateTemplateBudget,
  createEventFromBrief,
  getTemplate,
  PREP_LEAD_DAYS,
  prepLeadWarning,
} from "./templates";
import type { EventType } from "./types";

const EVENT_TYPES: EventType[] = ["wedding", "birthday", "community"];

const isoInDays = (days: number) => format(addDays(parseISO(todayISO()), days), "yyyy-MM-dd");

function briefFor(type: (typeof EVENT_TYPES)[number], dateISO: string) {
  return {
    name: "Test wedding",
    type,
    date: dateISO,
    city: "Jaipur",
    guestCount: 200,
    totalBudgetPaise: 12_00_000_00,
    priorities: ["Budget"],
    theme: "",
    foodPreference: "",
    accessibility: "",
    notes: "",
  };
}

describe("template budget math", () => {
  it("splits the budget exactly: categories + contingency add up to the total", () => {
    for (const type of EVENT_TYPES) {
      const event = createEventFromBrief(briefFor(type, isoInDays(PREP_LEAD_DAYS[type] + 1)));
      const totals = computeBudgetTotals(event);
      expect(totals.allocatedPaise).toBe(totals.totalBudgetPaise);
      expect(totals.spentPaise).toBe(0);
      expect(totals.remainingPaise).toBe(totals.totalBudgetPaise);
    }
  });

  it.each(EVENT_TYPES)(
    "reconciles review and creation for tiny, fractional and maximum-safe %s budgets",
    (type) => {
      for (const total of [
        ...Array.from({ length: 200 }, (_, i) => i + 1),
        12345,
        Number.MAX_SAFE_INTEGER,
      ]) {
        const review = allocateTemplateBudget(type, total);
        const sum = review.categories.reduce(
          (s, c) => s + BigInt(c.allocatedPaise),
          BigInt(review.contingencyPaise),
        );
        expect(sum).toBe(BigInt(total));
        expect(
          review.categories.every(
            (c) => Number.isSafeInteger(c.allocatedPaise) && c.allocatedPaise >= 0,
          ),
        ).toBe(true);
        const event = createEventFromBrief({
          ...briefFor(type, "2099-01-01"),
          totalBudgetPaise: total,
        });
        expect(event.budget.categories.map((c) => c.allocatedPaise)).toEqual(
          review.categories.map((c) => c.allocatedPaise),
        );
      }
    },
  );

  it("reserves the fixed contingency share of the total", () => {
    const event = createEventFromBrief(briefFor("birthday", isoInDays(60)));
    expect(event.budget.contingencyPaise).toBe(
      Math.round((event.brief.totalBudgetPaise * CONTINGENCY_PCT) / 100),
    );
  });

  it("keeps each template's category percentages plus contingency at 100%", () => {
    for (const type of EVENT_TYPES) {
      const sum = getTemplate(type).budget.reduce((s, c) => s + c.pct, 0);
      expect(sum + CONTINGENCY_PCT).toBe(100);
    }
  });
});

describe("prepLeadWarning", () => {
  it("warns when the date leaves less lead time than the template needs", () => {
    const warning = prepLeadWarning("wedding", isoInDays(30));
    expect(warning).toMatch(/180 days/);
    expect(warning).toMatch(/30 days/);
  });

  it("stays quiet when there is enough preparation time", () => {
    expect(prepLeadWarning("wedding", isoInDays(180))).toBeNull();
    expect(prepLeadWarning("birthday", isoInDays(45))).toBeNull();
    expect(prepLeadWarning("community", isoInDays(90))).toBeNull();
  });

  it("warns one day inside the lead-time threshold", () => {
    expect(prepLeadWarning("birthday", isoInDays(44))).toMatch(/45 days/);
    expect(prepLeadWarning("community", isoInDays(89))).toMatch(/90 days/);
  });

  it("ignores blank or malformed dates", () => {
    expect(prepLeadWarning("wedding", "")).toBeNull();
    expect(prepLeadWarning("wedding", "not-a-date")).toBeNull();
  });
});
