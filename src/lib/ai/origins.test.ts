import { describe, expect, it, vi } from "vitest";
import { plannerOrigins } from "./origins";
import { createPlannerHandler, type PlannerDatabase } from "./service";

describe("deployment origins", () => {
  it("allows the production browser preflight without authenticating or generating", async () => {
    const authenticate = vi.fn();
    const handler = createPlannerHandler({
      origins: plannerOrigins(),
      authenticate,
      database: {} as PlannerDatabase,
      provider: null,
      model: "test-model",
      background: vi.fn(),
    });
    const response = await handler(new Request("https://example.test/planner", {
      method: "OPTIONS", headers: { origin: "https://eventora-ai-phi.vercel.app" },
    }));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://eventora-ai-phi.vercel.app");
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("rejects lookalike deployment origins", async () => {
    const handler = createPlannerHandler({
      origins: plannerOrigins(), authenticate: vi.fn(), database: {} as PlannerDatabase,
      provider: null, model: "test-model", background: vi.fn(),
    });
    const response = await handler(new Request("https://example.test/planner", {
      method: "OPTIONS", headers: { origin: "https://eventora-ai-phi.vercel.app.attacker.example" },
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("preserves explicit operator overrides, including an empty allowlist", () => {
    expect(plannerOrigins(" https://custom.example , ,https://preview.example ")).toEqual([
      "https://custom.example", "https://preview.example",
    ]);
    expect(plannerOrigins("")).toEqual([]);
  });
});
