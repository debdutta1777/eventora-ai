import { describe, it, expect } from "vitest";
import { aiPlanSchema, materializeAIPlan } from "./plan";
import { aiEvent, aiFixture, RUN_ID } from "@/test/ai-fixtures";
import { eventSchema } from "../schemas";
import { computeBudgetTotals } from "../format";
describe("AI proposal domain validation", () => {
  it("allocates exact integer totals, protects expenses and preserves all existing work", () => {
    const e = aiEvent();
    e.budget.categories[0]!.expenses = [
      { id: "advance", label: "Cake advance", amountPaise: 400000 },
    ];
    e.tasks[0]!.completed = true;
    e.ideas[0]!.saved = true;
    e.vendorGroups[0]!.items[0]!.status = "confirmed";
    const next = materializeAIPlan(e, aiFixture(e), RUN_ID, "test-model");
    expect(computeBudgetTotals(next).allocatedPaise).toBe(e.brief.totalBudgetPaise);
    expect(next.budget.categories[0]!.allocatedPaise).toBeGreaterThanOrEqual(400000);
    expect(next.budget.categories[0]!.expenses).toEqual(e.budget.categories[0]!.expenses);
    expect(next.tasks[0]).toEqual(e.tasks[0]);
    expect(next.ideas[0]).toEqual(e.ideas[0]);
    expect(next.vendorGroups[0]).toEqual(e.vendorGroups[0]);
    expect(eventSchema.safeParse(next).success).toBe(true);
    expect(next.aiPlan?.runId).toBe(RUN_ID);
  });
  it("balances tiny and large budgets without rounding drift", () => {
    for (const amount of [1, 10, 12345, 7500000, Number.MAX_SAFE_INTEGER]) {
      const e = aiEvent();
      e.brief.totalBudgetPaise = amount;
      const next = materializeAIPlan(e, aiFixture(e), RUN_ID, "test-model");
      const exact =
        next.budget.categories.reduce((s, c) => s + BigInt(c.allocatedPaise), 0n) +
        BigInt(next.budget.contingencyPaise);
      expect(exact).toBe(BigInt(amount));
    }
  });
  it("rejects foreign, duplicate and missing categories and zero weights", () => {
    const e = aiEvent();
    const p = aiFixture(e);
    p.allocations[0]!.categoryId = "foreign";
    expect(() => materializeAIPlan(e, p, RUN_ID, "test")).toThrow(/exactly once/);
    const dup = aiFixture(e);
    dup.allocations[1]!.categoryId = dup.allocations[0]!.categoryId;
    expect(() => materializeAIPlan(e, dup, RUN_ID, "test")).toThrow();
    const missing = aiFixture(e);
    missing.allocations.pop();
    expect(() => materializeAIPlan(e, missing, RUN_ID, "test")).toThrow();
    const zero = aiFixture(e);
    zero.allocations.forEach((a) => (a.weight = 0));
    expect(() => materializeAIPlan(e, zero, RUN_ID, "test")).toThrow(/positive/);
  });
  it("rejects overspent, past, invalid or oversized proposals instead of inventing success", () => {
    const e = aiEvent();
    e.budget.categories[0]!.expenses = [
      { id: "expense", label: "Paid", amountPaise: e.brief.totalBudgetPaise + 1 },
    ];
    expect(() => materializeAIPlan(e, aiFixture(e), RUN_ID, "test")).toThrow(/exceed/);
    const past = aiEvent();
    past.brief.date = "2020-01-01";
    expect(() => materializeAIPlan(past, aiFixture(past), RUN_ID, "test")).toThrow(/passed/);
    expect(aiPlanSchema.safeParse({ summary: "Just a chat response" }).success).toBe(false);
    expect(aiPlanSchema.safeParse({ ...aiFixture(), summary: "x".repeat(1201) }).success).toBe(
      false,
    );
    expect(aiPlanSchema.safeParse({ ...aiFixture(), executeSQL: "DROP TABLE" }).success).toBe(
      false,
    );
  });
  it("compresses urgent task dates and deduplicates additions", () => {
    const e = aiEvent();
    const p = aiFixture(e);
    p.tasks.push({ ...p.tasks[0]! });
    p.vendors.push({ ...p.vendors[0]! });
    p.ideas.push({ ...p.ideas[0]! });
    const next = materializeAIPlan(e, p, RUN_ID, "test", "2030-01-09");
    expect(next.tasks).toHaveLength(e.tasks.length + 1);
    expect(next.tasks.at(-1)!.dueDate).toBe("2030-01-09");
    expect(next.aiPlan?.warnings.join()).toMatch(/compressed/);
    expect(next.ideas).toHaveLength(e.ideas.length + 1);
    expect(next.vendorGroups).toHaveLength(e.vendorGroups.length + 1);
  });
  it("rejects reversed idea ranges", () => {
    const e = aiEvent();
    const p = aiFixture(e);
    p.ideas[0]!.maxCostPaise = 0;
    expect(() => materializeAIPlan(e, p, RUN_ID, "test")).toThrow(/cost range/);
  });
  it("rejects supplier-shaped vendor output while accepting action-oriented checklists", () => {
    const e = aiEvent();
    const p = aiFixture(e);
    p.vendors[0]!.title = "Example Supplier Company";
    expect(() => materializeAIPlan(e, p, RUN_ID, "test")).toThrow(/checklist actions/);
    p.vendors[0]!.title = "Confirm dietary handling";
    p.vendors[0]!.note = "Specializes in catering";
    expect(() => materializeAIPlan(e, p, RUN_ID, "test")).toThrow(/checklist actions/);
  });
});
