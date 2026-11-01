import { beforeEach, describe, it, expect, vi } from "vitest";
import { createPlannerHandler, type PlannerDatabase } from "./service";
import { PlannerError, type ModelProvider } from "./gemini";
import { aiEvent, aiFixture, runFixture, RUN_ID, USER_A } from "@/test/ai-fixtures";
let event: ReturnType<typeof aiEvent>;
let run: ReturnType<typeof runFixture>;
let tasks: Promise<void>[];
let db: PlannerDatabase;
const authenticate = vi.fn<(token: string) => Promise<string | null>>();
const generate = vi.fn<ModelProvider["generate"]>();
beforeEach(() => {
  event = aiEvent();
  run = runFixture(event);
  tasks = [];
  authenticate.mockReset().mockResolvedValue(USER_A);
  generate.mockReset().mockResolvedValue(aiFixture(event));
  db = {
    event: vi.fn().mockResolvedValue({ record: event, revision: 1 }),
    reserve: vi.fn().mockResolvedValue({ created: true, run }),
    finish: vi.fn(),
    fail: vi.fn(),
    status: vi.fn().mockResolvedValue(run),
    apply: vi.fn().mockResolvedValue({ record: event, revision: 2 }),
  };
});
const handler = (provider = true) =>
  createPlannerHandler({
    authenticate,
    database: db,
    provider: provider ? { generate } : null,
    model: "test-model",
    origins: ["http://localhost:5173"],
    background: (task) => tasks.push(task),
  });
const request = (
  body: unknown,
  headers: Record<string, string> = { authorization: "Bearer test-session" },
) =>
  new Request("https://example.supabase.co/functions/v1/planner", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost:5173", ...headers },
    body: JSON.stringify(body),
  });
const generation = () => ({
  action: "generate",
  eventId: event.id,
  revision: 1,
  requestKey: RUN_ID,
  instruction: "Plan an accessible garden birthday",
});
describe("authenticated planning service", () => {
  it("authenticates, reserves, returns 202 and persists validated output in the background", async () => {
    const response = await handler()(request(generation()));
    expect(response.status).toBe(202);
    expect(db.reserve).toHaveBeenCalledWith(USER_A, event.id, 1, RUN_ID, "test-model");
    await Promise.all(tasks);
    expect(db.finish).toHaveBeenCalledWith(
      USER_A,
      RUN_ID,
      expect.any(Object),
      expect.objectContaining({ aiPlan: expect.objectContaining({ provider: "gemini" }) }),
    );
    expect(db.apply).not.toHaveBeenCalled();
  });
  it("does not generate again for a repeated request key", async () => {
    vi.mocked(db.reserve).mockResolvedValue({ created: false, run });
    const response = await handler()(request(generation()));
    expect(response.status).toBe(200);
    expect(generate).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated and untrusted-origin requests before model calls", async () => {
    expect((await handler()(request(generation(), { authorization: "" }))).status).toBe(401);
    expect(
      (await handler()(request(generation(), { origin: "https://untrusted.invalid" }))).status,
    ).toBe(403);
    authenticate.mockResolvedValue(null);
    expect((await handler()(request(generation()))).status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });
  it("fails clearly without a configured provider and rejects invalid requests", async () => {
    expect((await handler(false)(request(generation()))).status).toBe(503);
    expect((await handler()(request({ ...generation(), userId: "foreign-user" }))).status).toBe(
      400,
    );
    expect(db.reserve).not.toHaveBeenCalled();
  });
  it("rejects foreign and stale events", async () => {
    vi.mocked(db.event).mockResolvedValueOnce(null);
    expect((await handler()(request(generation()))).status).toBe(404);
    vi.mocked(db.event).mockResolvedValueOnce({ record: event, revision: 2 });
    expect((await handler()(request(generation()))).status).toBe(409);
    expect(db.reserve).not.toHaveBeenCalled();
  });
  it("persists a failed status after provider or domain errors without modifying events", async () => {
    generate.mockRejectedValueOnce(new PlannerError("provider_timeout", "Timed out"));
    await handler()(request(generation()));
    await Promise.all(tasks);
    expect(db.fail).toHaveBeenCalledWith(USER_A, RUN_ID, "provider_timeout");
    expect(db.finish).not.toHaveBeenCalled();
    expect(db.apply).not.toHaveBeenCalled();
  });
  it("enforces quota and scopes status/apply to the verified identity", async () => {
    vi.mocked(db.reserve).mockRejectedValueOnce(
      new PlannerError("quota_exceeded", "Limit reached", 429),
    );
    expect((await handler()(request(generation()))).status).toBe(429);
    await handler()(request({ action: "status", runId: RUN_ID }));
    expect(db.status).toHaveBeenCalledWith(USER_A, RUN_ID);
    await handler()(request({ action: "apply", runId: RUN_ID }));
    expect(db.apply).toHaveBeenCalledWith(USER_A, RUN_ID);
  });
  it("blocks applying historical proposals with invalid vendor checklist content", async () => {
    const proposal = aiFixture(event);
    proposal.vendors[0]!.title = "Example Supplier Company";
    vi.mocked(db.status).mockResolvedValueOnce({ ...run, status: "ready", proposal });
    expect((await handler()(request({ action: "apply", runId: RUN_ID }))).status).toBe(422);
    expect(db.apply).not.toHaveBeenCalled();
  });
});
