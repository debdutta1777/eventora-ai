import { z } from "zod";
import { TASK_CATEGORIES, VENDOR_STATUSES } from "./types.ts";
const money = z.number().int().safe().min(0);
const text = z.string().trim();
const id = z.string().min(1).max(100);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Enter a valid calendar date");
export const briefSchema = z.object({
  name: text.min(2),
  type: z.enum(["wedding", "birthday", "community"]),
  date: dateSchema,
  city: text.min(2),
  guestCount: z.number().int().safe().min(1),
  totalBudgetPaise: money.positive(),
  priorities: z.array(text).max(12),
  theme: text,
  foodPreference: text,
  accessibility: text,
  notes: text,
});
export const eventSchema = z
  .object({
    id,
    brief: briefSchema,
    budget: z.object({
      categories: z
        .array(
          z.object({
            id,
            name: text.min(1),
            allocatedPaise: money,
            locked: z.boolean().optional(),
            expenses: z.array(z.object({ id, label: text.min(1), amountPaise: money })).max(500),
          }),
        )
        .min(1)
        .max(30),
      contingencyPaise: money,
      contingencyLabel: text,
    }),
    tasks: z
      .array(
        z.object({
          id,
          title: text.min(1),
          category: z.enum(TASK_CATEGORIES),
          dueDate: dateSchema,
          completed: z.boolean(),
        }),
      )
      .max(500),
    vendorGroups: z
      .array(
        z.object({
          id,
          name: text,
          items: z
            .array(
              z.object({
                id,
                title: text,
                note: text,
                status: z.enum(VENDOR_STATUSES),
                done: z.boolean(),
              }),
            )
            .max(50),
        }),
      )
      .max(30),
    ideas: z
      .array(
        z.object({
          id,
          title: text,
          explanation: text,
          costRangeLabel: text,
          steps: z.array(text).max(20),
          saved: z.boolean(),
        }),
      )
      .max(100),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    isSample: z.boolean(),
    sampleOffsetDays: z.number().int().optional(),
    aiPlan: z
      .object({
        needsRefresh: z.boolean().optional(),
        runId: id,
        provider: z.literal("gemini"),
        model: z.string().max(100),
        promptVersion: z.string().max(100),
        generatedAt: z.string().datetime(),
        summary: z.string().max(1200),
        assumptions: z.array(z.string().max(1200)).max(10),
        warnings: z.array(z.string().max(1200)).max(12),
      })
      .optional(),
  })
  .superRefine((event, ctx) => {
    const ids = [
      event.id,
      ...event.budget.categories.flatMap((c) => [c.id, ...c.expenses.map((e) => e.id)]),
      ...event.tasks.map((t) => t.id),
      ...event.vendorGroups.flatMap((g) => [g.id, ...g.items.map((i) => i.id)]),
      ...event.ideas.map((i) => i.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Record IDs must be unique" });
  });
