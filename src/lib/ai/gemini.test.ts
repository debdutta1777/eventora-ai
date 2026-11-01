import { describe, it, expect, vi } from "vitest";
import { createGeminiProvider, makePrompt } from "./gemini";
import { aiEvent, aiFixture } from "@/test/ai-fixtures";
const response = (output: unknown) =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }),
    { status: 200 },
  );
describe("Gemini server-side adapter", () => {
  it("requests structured JSON and parses a valid provider response", async () => {
    const e = aiEvent();
    const p = aiFixture(e);
    const fetcher = vi.fn().mockResolvedValue(response(p));
    expect(
      await createGeminiProvider("not-a-real-key", "test-model", fetcher).generate(
        e,
        "Prioritize accessibility",
      ),
    ).toEqual(p);
    const request = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(request.generationConfig.responseJsonSchema.required).toContain("ideas");
    expect(JSON.stringify(request)).not.toContain("not-a-real-key");
    expect(makePrompt(e, "Request")).toContain("untrusted user data");
  });
  it("uses one validated JSON-mode compatibility retry when model access succeeds", async () => {
    const e = aiEvent();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { status: "INVALID_ARGUMENT" } }), { status: 400 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: "models/test" })))
      .mockResolvedValueOnce(response(aiFixture(e)));
    expect(await createGeminiProvider("secret-test", "test", fetcher).generate(e, "Plan")).toEqual(
      aiFixture(e),
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
    const retry = JSON.parse(fetcher.mock.calls[2]![1].body);
    expect(retry.generationConfig.responseMimeType).toBe("application/json");
    expect(retry.generationConfig.responseJsonSchema).toBeUndefined();
    expect(retry.contents[0].parts[0].text).toContain('"required"');
    expect(JSON.stringify(retry)).not.toContain("secret-test");
  });
  it("reports only safe machine codes when metadata access fails", async () => {
    const e = aiEvent();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "secret-test", status: "INVALID_ARGUMENT" } }),
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(new Response("", { status: 403 }));
    await expect(
      createGeminiProvider("secret-test", "test", fetcher).generate(e, "Plan"),
    ).rejects.toMatchObject({ code: "provider_http_400_MODEL_CHECK_403" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("repairs malformed output once", async () => {
    const e = aiEvent();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ summary: "Incomplete" }))
      .mockResolvedValueOnce(response(aiFixture(e)));
    await createGeminiProvider("test", "test", fetcher).generate(e, "Plan");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1]![1].body).contents[0].parts[0].text).toContain(
      "failed local schema validation",
    );
  });
  it("retries transient errors but bounds attempts", async () => {
    const e = aiEvent();
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    await expect(
      createGeminiProvider("test", "test", fetcher).generate(e, "Plan"),
    ).rejects.toMatchObject({ code: "provider_rate_limit" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("handles timeouts and blocked/empty model output without a template fallback", async () => {
    const e = aiEvent();
    const timeout = vi.fn().mockRejectedValue(new DOMException("Timeout", "TimeoutError"));
    await expect(
      createGeminiProvider("test", "test", timeout).generate(e, "Plan"),
    ).rejects.toMatchObject({ code: "provider_timeout" });
    const empty = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}")));
    await expect(
      createGeminiProvider("test", "test", empty).generate(e, "Plan"),
    ).rejects.toMatchObject({ code: "invalid_model_output" });
  });
});
