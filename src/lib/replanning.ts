import { eventSchema } from "./schemas.ts";
import type { BudgetCategory, EventRecord } from "./types.ts";

/** Allocate the whole budget exactly, protecting paid amounts and explicit category locks. */
export function allocateBudget(
  categories: BudgetCategory[],
  totalPaise: number,
  desiredReservePaise: number,
  weights: bigint[],
): { categories: BudgetCategory[]; contingencyPaise: number } {
  if (
    !Number.isSafeInteger(totalPaise) ||
    totalPaise <= 0 ||
    !Number.isSafeInteger(desiredReservePaise) ||
    desiredReservePaise < 0 ||
    weights.length !== categories.length ||
    weights.some((w) => w < 0n)
  )
    throw new Error("Enter a valid budget and allocation weights.");
  const paid = categories.map((c) => c.expenses.reduce((s, e) => s + BigInt(e.amountPaise), 0n));
  if (paid.reduce((s, n) => s + n, 0n) > BigInt(totalPaise))
    throw new Error("Recorded expenses exceed the event budget. Raise it before replanning.");
  const floors = categories.map((c, i) => {
    if (c.locked && BigInt(c.allocatedPaise) < paid[i]!)
      throw new Error(`Unlock ${c.name} or raise its allocation to cover recorded expenses.`);
    return c.locked ? BigInt(c.allocatedPaise) : paid[i]!;
  });
  const available = BigInt(totalPaise) - floors.reduce((s, n) => s + n, 0n);
  if (available < 0n)
    throw new Error(
      "The budget cannot cover locked allocations and recorded expenses. Raise it or unlock categories.",
    );
  let reserve = BigInt(desiredReservePaise) < available ? BigInt(desiredReservePaise) : available;
  const unlocked = categories.flatMap((c, i) => (c.locked ? [] : [i]));
  if (!unlocked.length) reserve = available;
  const distributable = available - reserve;
  const effective = weights.map((w, i) => (categories[i]!.locked ? 0n : w));
  if (unlocked.length && effective.reduce((s, w) => s + w, 0n) === 0n)
    unlocked.forEach((i) => {
      effective[i] = 1n;
    });
  const weightTotal = effective.reduce((s, n) => s + n, 0n);
  const shares = effective.map((w) => (weightTotal ? (distributable * w) / weightTotal : 0n));
  const ranked = unlocked
    .map((i) => ({ i, fraction: (distributable * effective[i]!) % weightTotal }))
    .sort((a, b) => (a.fraction === b.fraction ? a.i - b.i : a.fraction > b.fraction ? -1 : 1));
  const drift = Number(distributable - shares.reduce((s, n) => s + n, 0n));
  for (let i = 0; i < drift; i++) shares[ranked[i]!.i] = shares[ranked[i]!.i]! + 1n;
  return {
    categories: categories.map((c, i) => ({
      ...c,
      allocatedPaise: Number(floors[i]! + shares[i]!),
    })),
    contingencyPaise: Number(reserve),
  };
}

/** A deterministic preview; AI recommendations can be refreshed after saving the changed brief. */
export function replanEvent(
  input: EventRecord,
  totalBudgetPaise: number,
  guestCount: number,
  lockedIds: string[],
): EventRecord {
  const event = eventSchema.parse(input);
  if (!Number.isSafeInteger(guestCount) || guestCount < 1)
    throw new Error("Enter a positive whole number of guests.");
  if (
    new Set(lockedIds).size !== lockedIds.length ||
    lockedIds.some((id) => !event.budget.categories.some((c) => c.id === id))
  )
    throw new Error("Choose valid categories to lock.");
  if (!Number.isSafeInteger(totalBudgetPaise) || totalBudgetPaise <= 0)
    throw new Error("Enter a positive budget with at most two decimal places.");
  const categories = event.budget.categories.map((c) => ({
    ...c,
    locked: lockedIds.includes(c.id),
  }));
  const proportionalReserve =
    (BigInt(totalBudgetPaise) * BigInt(event.budget.contingencyPaise)) /
    BigInt(event.brief.totalBudgetPaise);
  const reserve = Number(
    proportionalReserve > BigInt(totalBudgetPaise) ? BigInt(totalBudgetPaise) : proportionalReserve,
  );
  const allocated = allocateBudget(
    categories,
    totalBudgetPaise,
    Math.min(reserve, totalBudgetPaise),
    categories.map((c) => {
      const paid = c.expenses.reduce((s, e) => s + BigInt(e.amountPaise), 0n);
      return BigInt(c.allocatedPaise) > paid ? BigInt(c.allocatedPaise) - paid : 0n;
    }),
  );
  return eventSchema.parse({
    ...event,
    brief: { ...event.brief, totalBudgetPaise, guestCount },
    budget: { ...event.budget, ...allocated },
    aiPlan: event.aiPlan ? { ...event.aiPlan, needsRefresh: true } : undefined,
    updatedAt: new Date().toISOString(),
  });
}
