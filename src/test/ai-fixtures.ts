import { createEventFromBrief } from "@/lib/templates";
import type { AIPlan, PlanRun } from "@/lib/ai/plan";
export const USER_A = "11111111-1111-4111-8111-111111111111";
export const USER_B = "22222222-2222-4222-8222-222222222222";
export const RUN_ID = "33333333-3333-4333-8333-333333333333";
export function aiEvent() {
  return createEventFromBrief({
    name: "AI test birthday",
    type: "birthday",
    date: "2030-01-10",
    city: "Kolkata",
    guestCount: 50,
    totalBudgetPaise: 7500000,
    priorities: ["Food"],
    theme: "Garden",
    foodPreference: "Vegetarian",
    accessibility: "Step-free entrance",
    notes: "Prefer reusable decorations",
  });
}
export function aiFixture(event = aiEvent()): AIPlan {
  return {
    summary: "A vegetarian garden celebration with accessible guest circulation.",
    assumptions: ["Illustrative estimates; obtain real quotes."],
    warnings: [],
    allocations: event.budget.categories.map((c, i) => ({ categoryId: c.id, weight: i + 1 })),
    contingencyPercent: 5,
    tasks: [
      { title: "Confirm accessible guest circulation", category: "Venue", daysBeforeEvent: 7 },
    ],
    vendors: [
      {
        category: "Catering",
        title: "Confirm vegetarian menu and allergen handling",
        note: "Ask for written dietary information and a quote.",
      },
    ],
    ideas: [
      {
        title: "Reusable garden place cards",
        rationale: "Fits the garden theme and reduces waste.",
        minCostPaise: 10000,
        maxCostPaise: 20000,
        steps: ["Use reusable holders", "Write guest names"],
      },
    ],
  };
}
export function runFixture(event = aiEvent()): PlanRun {
  return {
    id: RUN_ID,
    event_id: event.id,
    base_revision: 1,
    base_record: event,
    status: "generating",
    proposal: null,
    proposed_record: null,
    error_code: null,
    created_at: new Date().toISOString(),
    model: "test-model",
  };
}
