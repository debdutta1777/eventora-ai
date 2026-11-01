import { z } from "zod";
import { TASK_CATEGORIES, type EventRecord } from "../types.ts";
import { allocateBudget } from "../replanning.ts";
import { eventSchema } from "../schemas.ts";

const text = z.string().trim().min(1).max(1200);
const money = z.number().int().safe().min(0);
export const aiPlanSchema = z
  .object({
    summary: text,
    assumptions: z.array(text).max(10),
    warnings: z.array(text).max(10),
    allocations: z
      .array(
        z
          .object({
            categoryId: z.string().min(1).max(100),
            weight: z.number().int().min(0).max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    contingencyPercent: z.number().int().min(0).max(20),
    tasks: z
      .array(
        z
          .object({
            title: text,
            category: z.enum(TASK_CATEGORIES),
            daysBeforeEvent: z.number().int().min(0).max(730),
          })
          .strict(),
      )
      .min(1)
      .max(25),
    vendors: z
      .array(z.object({ category: text, title: text, note: text }).strict())
      .min(1)
      .max(12),
    ideas: z
      .array(
        z
          .object({
            title: text,
            rationale: text,
            minCostPaise: money,
            maxCostPaise: money,
            steps: z.array(text).min(1).max(8),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();
export type AIPlan = z.infer<typeof aiPlanSchema>;
export const PROMPT_VERSION = "eventora-plan-v2";
export const VENDOR_ACTION_PATTERN =
  "^(Ask|Check|Confirm|Compare|Request|Verify|Inspect|Review|Obtain|Research|Assess|Arrange|Ensure|Get|Keep|Plan)\\b";
/** Validate new suggestions without making historical plan records unreadable. */
export function validateVendorChecklist(plan: AIPlan): void {
  const action = new RegExp(VENDOR_ACTION_PATTERN, "i");
  if (plan.vendors.some((v) => !action.test(v.title) || !action.test(v.note)))
    throw new Error(
      "Vendor suggestions must be checklist actions, not supplier names or service claims.",
    );
}
export interface PlanRun {
  id: string;
  event_id: string;
  base_revision: number;
  base_record: EventRecord;
  status: "generating" | "ready" | "applied" | "failed";
  proposal: AIPlan | null;
  proposed_record: EventRecord | null;
  error_code: string | null;
  created_at: string;
  model: string;
}
const normalized = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

/** Weighted allocation uses BigInt and largest remainders; every paid paise is protected. */
export function materializeAIPlan(
  input: EventRecord,
  raw: unknown,
  runId: string,
  model: string,
  today = new Date().toISOString().slice(0, 10),
): EventRecord {
  const event = eventSchema.parse(input);
  const plan = aiPlanSchema.parse(raw);
  validateVendorChecklist(plan);
  if (event.brief.date < today)
    throw new Error("The event date has passed. Create a future event before generating a plan.");
  const categoryIds = plan.allocations.map((a) => a.categoryId);
  if (
    categoryIds.length !== event.budget.categories.length ||
    new Set(categoryIds).size !== categoryIds.length ||
    categoryIds.some((id) => !event.budget.categories.some((c) => c.id === id))
  )
    throw new Error("Every current budget category must appear exactly once.");
  if (!plan.allocations.some((a) => a.weight > 0))
    throw new Error("At least one allocation weight must be positive.");
  const { categories, contingencyPaise } = allocateBudget(
    event.budget.categories,
    event.brief.totalBudgetPaise,
    Number((BigInt(event.brief.totalBudgetPaise) * BigInt(plan.contingencyPercent)) / 100n),
    event.budget.categories.map((c) =>
      BigInt(plan.allocations.find((a) => a.categoryId === c.id)!.weight),
    ),
  );
  const warning = [...plan.warnings];
  const dateFor = (offset: number) => {
    const date = new Date(`${event.brief.date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const planned = date.toISOString().slice(0, 10);
    if (planned < today) {
      if (
        !warning.includes("Urgent preparation dates were compressed to today; confirm feasibility.")
      )
        warning.push("Urgent preparation dates were compressed to today; confirm feasibility.");
      return today;
    }
    return planned;
  };
  if (plan.ideas.some((idea) => idea.maxCostPaise < idea.minCostPaise))
    throw new Error("An idea has an invalid cost range.");
  const taskNames = new Set(event.tasks.map((t) => normalized(t.title)));
  const newTasks = plan.tasks
    .filter((t) => {
      const key = normalized(t.title);
      if (taskNames.has(key)) return false;
      taskNames.add(key);
      return true;
    })
    .map((t, i) => ({
      id: `${runId}-task-${i}`,
      title: t.title,
      category: t.category,
      dueDate: dateFor(t.daysBeforeEvent),
      completed: false,
    }));
  const vendorNames = new Set(
    event.vendorGroups.flatMap((g) => g.items.map((i) => normalized(i.title))),
  );
  const newVendors = plan.vendors
    .filter((v) => {
      const key = normalized(v.title);
      if (vendorNames.has(key)) return false;
      vendorNames.add(key);
      return true;
    })
    .map((v, i) => ({
      id: `${runId}-group-${i}`,
      name: v.category,
      items: [
        {
          id: `${runId}-vendor-${i}`,
          title: v.title,
          note: v.note,
          status: "needed" as const,
          done: false,
        },
      ],
    }));
  const ideaNames = new Set(event.ideas.map((i) => normalized(i.title)));
  const newIdeas = plan.ideas
    .filter((idea) => {
      const key = normalized(idea.title);
      if (ideaNames.has(key)) return false;
      ideaNames.add(key);
      return true;
    })
    .map((idea, i) => ({
      id: `${runId}-idea-${i}`,
      title: idea.title,
      explanation: idea.rationale,
      costRangeLabel: `₹${idea.minCostPaise / 100}–₹${idea.maxCostPaise / 100} (estimate)`,
      steps: idea.steps,
      saved: false,
    }));
  return eventSchema.parse({
    ...event,
    budget: { ...event.budget, categories, contingencyPaise },
    tasks: [...event.tasks, ...newTasks],
    vendorGroups: [...event.vendorGroups, ...newVendors],
    ideas: [...event.ideas, ...newIdeas],
    isSample: false,
    updatedAt: new Date().toISOString(),
    aiPlan: {
      runId,
      provider: "gemini",
      model,
      promptVersion: PROMPT_VERSION,
      generatedAt: new Date().toISOString(),
      summary: plan.summary,
      assumptions: plan.assumptions,
      warnings: warning,
    },
  });
}
