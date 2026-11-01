import { describe, expect, it, vi } from "vitest";
import { readPlanningBody } from "./request-body";

describe("bounded planning requests", () => {
  it("decodes UTF-8 correctly when a character is split across chunks", async () => {
    const bytes = new TextEncoder().encode('"₹"');
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(bytes.slice(0, 2));
        c.enqueue(bytes.slice(2));
        c.close();
      },
    });
    const request = new Request("https://example.test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readPlanningBody(request)).toBe('"₹"');
  });
  it("rejects and cancels oversized chunked bodies without relying on character count", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("₹".repeat(4000)));
      },
      cancel,
    });
    const request = new Request("https://example.test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readPlanningBody(request)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("accepts a body at the byte limit and rejects a declared oversized body", async () => {
    expect(
      await readPlanningBody(
        new Request("https://example.test", { method: "POST", body: "x".repeat(10000) }),
      ),
    ).toHaveLength(10000);
    await expect(
      readPlanningBody(
        new Request("https://example.test", {
          method: "POST",
          headers: { "content-length": "10001" },
          body: "x",
        }),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
