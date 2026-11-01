import { describe, expect, it } from "vitest";
import { briefFromForm, EVENT_TYPES, INITIAL, validateEventForm } from "./event-form";
import { createEventFromBrief } from "./templates";
import { computeBudgetTotals } from "./format";
import { makePrompt } from "./ai/gemini";
import { materializeAIPlan } from "./ai/plan";
import { aiFixture, RUN_ID } from "@/test/ai-fixtures";

const form = () => ({
  ...INITIAL,
  name: " Synthetic event ",
  date: "2030-01-10",
  city: " Pune ",
  guestCount: "20",
  budgetRupees: "60000.13",
  priorities: ["Guest comfort"],
  theme: "Garden",
  foodPreference: "Vegetarian",
  accessibility: "Step-free entrance",
  notes: "Reusable decorations",
});

describe("event brief acceptance", () => {
  it.each(EVENT_TYPES)(
    "carries %s preferences through wizard, model prompt and reviewed plan",
    (type) => {
      const input = { ...form(), type };
      expect(validateEventForm(input, 3, "2026-11-01")).toBeNull();
      const brief = briefFromForm(input);
      expect(brief.name).toBe("Synthetic event");
      const event = createEventFromBrief(brief);
      const prompt = makePrompt(event, "Keep guest comfort central");
      for (const value of [
        type,
        "Garden",
        "Vegetarian",
        "Step-free entrance",
        "Reusable decorations",
        "Guest comfort",
      ])
        expect(prompt).toContain(value);
      const proposal = materializeAIPlan(
        event,
        aiFixture(event),
        RUN_ID,
        "synthetic-provider",
        "2026-11-01",
      );
      expect(proposal.brief).toEqual(brief);
      expect(computeBudgetTotals(proposal).allocatedPaise).toBe(6000013);
      expect(proposal.tasks.length).toBeGreaterThan(event.tasks.length);
      expect(proposal.vendorGroups.length).toBeGreaterThan(event.vendorGroups.length);
      expect(proposal.ideas.length).toBeGreaterThan(event.ideas.length);
      expect(proposal.aiPlan?.provider).toBe("gemini");
    },
  );
  it.each([
    ["name", " ", "name"],
    ["date", "2030-02-30", "date"],
    ["date", "2020-01-01", "date"],
    ["city", " ", "city"],
    ["guestCount", "1.5", "guestCount"],
    ["guestCount", "0", "guestCount"],
    ["budgetRupees", "0", "budgetRupees"],
    ["budgetRupees", "12.345", "budgetRupees"],
  ])("associates invalid %s input %j with its field", (field, value, expectedField) => {
    expect(validateEventForm({ ...form(), [field]: value }, 3, "2026-11-01")?.field).toBe(
      expectedField,
    );
  });
  it("requires a priority at review while allowing preferences to remain optional", () => {
    expect(validateEventForm({ ...form(), priorities: [] }, 2, "2026-11-01")).toBeNull();
    expect(validateEventForm({ ...form(), priorities: [] }, 3, "2026-11-01")?.field).toBe(
      "priorities",
    );
  });
});
