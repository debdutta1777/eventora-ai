import { describe, it, expect } from "vitest";
import { allocateBudget, replanEvent } from "./replanning";
import { aiEvent, aiFixture, RUN_ID } from "@/test/ai-fixtures";
import { materializeAIPlan } from "./ai/plan";
const sum = (e: ReturnType<typeof aiEvent>) =>
  e.budget.categories.reduce((s, c) => s + c.allocatedPaise, e.budget.contingencyPaise);
describe("budget and guest replanning", () => {
  it("reconciles fractional money exactly while preserving paid amounts, locks and manual work", () => {
    const e = aiEvent();
    e.budget.categories[1]!.expenses = [{ id: "cake", label: "Cake advance", amountPaise: 400000 }];
    e.tasks[0]!.completed = true;
    e.vendorGroups[0]!.items[0]!.status = "contacted";
    e.ideas[0]!.saved = true;
    const next = replanEvent(e, 6000013, 80, [e.budget.categories[0]!.id]);
    expect(sum(next)).toBe(6000013);
    expect(next.budget.categories[0]!.allocatedPaise).toBe(e.budget.categories[0]!.allocatedPaise);
    expect(next.budget.categories[1]!.allocatedPaise).toBeGreaterThanOrEqual(400000);
    expect(next.budget.categories[1]!.expenses).toEqual(e.budget.categories[1]!.expenses);
    expect(next.brief.guestCount).toBe(80);
    expect(next.tasks).toEqual(e.tasks);
    expect(next.vendorGroups).toEqual(e.vendorGroups);
    expect(next.ideas).toEqual(e.ideas);
    expect(e.brief.guestCount).toBe(50);
  });
  it("rejects infeasible locks and invalid guests instead of losing recorded expenses", () => {
    const e = aiEvent();
    expect(() => replanEvent(e, 1, 50, [e.budget.categories[0]!.id])).toThrow(/cannot cover/);
    e.budget.categories[0]!.expenses = [{ id: "paid", label: "Venue", amountPaise: 2000000 }];
    expect(() => replanEvent(e, 7000000, 50, [e.budget.categories[0]!.id])).toThrow(/Unlock/);
    for (const guests of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() => replanEvent(e, 7000000, guests, [])).toThrow(/guests/);
    expect(() => replanEvent(e, 7000000, 50, ["unknown"])).toThrow(/valid categories/);
  });
  it("allocates tiny amounts and safe-integer maximum without drift", () => {
    const e = aiEvent();
    for (const amount of [1, 12345, Number.MAX_SAFE_INTEGER]) {
      expect(sum(replanEvent(e, amount, 50, []))).toBe(amount);
    }
  });
  it("keeps all locked categories and sends leftover money to contingency", () => {
    const e = aiEvent();
    const next = replanEvent(
      e,
      9000000,
      50,
      e.budget.categories.map((c) => c.id),
    );
    expect(next.budget.categories.map((c) => c.allocatedPaise)).toEqual(
      e.budget.categories.map((c) => c.allocatedPaise),
    );
    expect(sum(next)).toBe(9000000);
    expect(next.budget.contingencyPaise).toBe(1875000);
  });
  it("respects locks in subsequent AI proposals and marks changed briefs for refresh", () => {
    const e = aiEvent();
    const generated = materializeAIPlan(e, aiFixture(e), RUN_ID, "test-model");
    const next = replanEvent(generated, 9000000, 75, [generated.budget.categories[0]!.id]);
    expect(next.aiPlan?.needsRefresh).toBe(true);
    const refreshed = materializeAIPlan(next, aiFixture(next), RUN_ID, "test-model");
    expect(refreshed.aiPlan?.needsRefresh).toBeUndefined();
    expect(refreshed.budget.categories[0]!.allocatedPaise).toBe(
      next.budget.categories[0]!.allocatedPaise,
    );
    expect(sum(refreshed)).toBe(9000000);
  });
  it("splits evenly when unlocked categories have no remaining allocation weights", () => {
    const e = aiEvent();
    const categories = e.budget.categories.map((c) => ({ ...c, allocatedPaise: 0 }));
    const next = allocateBudget(
      categories,
      17,
      0,
      categories.map(() => 0n),
    );
    expect(next.categories.reduce((s, c) => s + c.allocatedPaise, 0)).toBe(17);
    expect(
      Math.max(...next.categories.map((c) => c.allocatedPaise)) -
        Math.min(...next.categories.map((c) => c.allocatedPaise)),
    ).toBeLessThanOrEqual(1);
  });
});
