import { beforeEach, describe, it, expect } from "vitest";
import { buildSampleEvents } from "./demo-data";
import { isEventRecord, loadStoredEvents, saveEvents } from "./storage";
import { rupeesToPaise, computeBudgetTotals } from "./format";
import { createEventFromBrief } from "./templates";
beforeEach(() => localStorage.clear());
describe("persistent data boundary", () => {
  it("persists all nested edits", () => {
    const events = buildSampleEvents();
    const e = events[0]!;
    e.budget.categories[0]!.expenses.push({
      id: "paid",
      label: "Cake advance",
      amountPaise: 400000,
    });
    e.tasks[0]!.completed = true;
    e.vendorGroups[0]!.items[0]!.status = "contacted";
    e.ideas[0]!.saved = true;
    saveEvents(events);
    expect(loadStoredEvents()).toEqual(events);
  });
  it("handles malformed storage and nested budget corruption", () => {
    localStorage.setItem("eventora.events.v1", "broken");
    expect(loadStoredEvents()).toBeNull();
    const e = buildSampleEvents()[0]!;
    e.budget.categories[0]!.allocatedPaise = -1;
    expect(isEventRecord(e)).toBe(false);
    localStorage.setItem("eventora.events.v1", JSON.stringify([e]));
    expect(loadStoredEvents()).toBeNull();
  });
  it("rejects impossible calendar dates, fractional paise, duplicate IDs and malformed vendors", () => {
    const e = buildSampleEvents()[0]!;
    const bad = structuredClone(e);
    bad.brief.date = "2030-02-30";
    expect(isEventRecord(bad)).toBe(false);
    bad.brief.date = e.brief.date;
    bad.budget.contingencyPaise = 1.5;
    expect(isEventRecord(bad)).toBe(false);
    const duplicate = structuredClone(e);
    duplicate.tasks[1]!.id = duplicate.tasks[0]!.id;
    expect(isEventRecord(duplicate)).toBe(false);
    const vendor = structuredClone(e);
    delete (
      vendor.vendorGroups[0]!.items[0] as Partial<(typeof vendor.vendorGroups)[0]["items"][0]>
    ).title;
    expect(isEventRecord(vendor)).toBe(false);
  });
  it("preserves an intentionally empty event list", () => {
    saveEvents([]);
    expect(loadStoredEvents()).toEqual([]);
  });
});
describe("money and timeline", () => {
  it("rejects partial numbers, scientific notation, excess precision, negatives and unsafe values", () => {
    for (const input of ["123abc", "1e4", "1.234", "-4", "Infinity", "", "9007199254740991"])
      expect(rupeesToPaise(input)).toBeNaN();
    expect(rupeesToPaise("123.45")).toBe(12345);
  });
  it("keeps exact allocation totals even at half-paise rounding boundaries", () => {
    const brief = buildSampleEvents()[0]!.brief;
    for (const total of [1, 10, 30, 12345, 7500000]) {
      const e = createEventFromBrief({ ...brief, totalBudgetPaise: total });
      expect(computeBudgetTotals(e).allocatedPaise).toBe(total);
    }
  });
  it("compresses template deadlines for short lead times", () => {
    const brief = buildSampleEvents()[0]!.brief;
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const e = createEventFromBrief({ ...brief, date: iso });
    expect(e.tasks.every((t) => t.dueDate === iso)).toBe(true);
  });
});
