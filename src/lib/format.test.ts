import { describe, expect, it } from "vitest";

import { addDays, format, parseISO } from "date-fns";

import { computeBudgetTotals, formatINR, rupeesToPaise, todayISO } from "./format";
import type { EventRecord } from "./types";

const isoInDays = (days: number) => format(addDays(parseISO(todayISO()), days), "yyyy-MM-dd");

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  const base: EventRecord = {
    id: "event-test",
    brief: {
      name: "Test event",
      type: "birthday",
      date: isoInDays(30),
      city: "Pune",
      guestCount: 50,
      totalBudgetPaise: 100_000_00,
      priorities: ["Food"],
      theme: "",
      foodPreference: "",
      accessibility: "",
      notes: "",
    },
    budget: {
      categories: [
        { id: "cat-1", name: "Food & cake", allocatedPaise: 25_000_00, expenses: [] },
        { id: "cat-2", name: "Venue", allocatedPaise: 15_000_00, expenses: [] },
      ],
      contingencyPaise: 5_000_00,
      contingencyLabel: "Contingency",
    },
    tasks: [],
    vendorGroups: [],
    ideas: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    isSample: false,
    ...overrides,
  };
  return base;
}

describe("rupeesToPaise", () => {
  it("converts whole rupees to exact integer paise", () => {
    expect(rupeesToPaise("4000")).toBe(400_000);
  });

  it("rounds paise amounts instead of dropping them", () => {
    expect(rupeesToPaise("123.45")).toBe(12_345);
  });

  it("accepts Indian-style comma grouping", () => {
    expect(rupeesToPaise("1,00,000")).toBe(10_000_000);
  });

  it("returns NaN for negative or non-numeric input", () => {
    expect(Number.isNaN(rupeesToPaise("-5"))).toBe(true);
    expect(Number.isNaN(rupeesToPaise("abc"))).toBe(true);
  });
});

describe("formatINR", () => {
  it("renders whole-rupee amounts without decimals", () => {
    expect(formatINR(400_000)).toBe("₹4,000");
  });

  it("keeps paise visible when the amount is not a whole rupee", () => {
    expect(formatINR(12_345)).toBe("₹123.45");
  });
});

describe("computeBudgetTotals", () => {
  it("totals spent and remaining across all categories", () => {
    const event = makeEvent({
      budget: {
        ...makeEvent().budget,
        categories: [
          {
            id: "cat-1",
            name: "Food & cake",
            allocatedPaise: 25_000_00,
            expenses: [
              { id: "exp-1", label: "Cake", amountPaise: 4_000_00 },
              { id: "exp-2", label: "Tasting", amountPaise: 123_45 },
            ],
          },
          {
            id: "cat-2",
            name: "Venue",
            allocatedPaise: 15_000_00,
            expenses: [{ id: "exp-3", label: "Deposit", amountPaise: 10_000_00 }],
          },
        ],
      },
    });

    const totals = computeBudgetTotals(event);
    expect(totals.spentPaise).toBe(14_123_45);
    expect(totals.remainingPaise).toBe(100_000_00 - 14_123_45);
    expect(totals.overspentPaise).toBe(0);
  });

  it("reports the exact over-budget amount when spending exceeds the total", () => {
    const event = makeEvent({
      budget: {
        ...makeEvent().budget,
        categories: [
          {
            id: "cat-1",
            name: "Food & cake",
            allocatedPaise: 25_000_00,
            expenses: [{ id: "exp-1", label: "Cake", amountPaise: 101_000_00 }],
          },
        ],
      },
    });

    const totals = computeBudgetTotals(event);
    expect(totals.overspentPaise).toBe(1_000_00);
  });
});
