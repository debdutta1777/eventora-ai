import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import server from "./server";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: mocks.fetch } }));
beforeEach(() => {
  mocks.fetch.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
const request = () => server.fetch(new Request("https://example.test/"), {}, {});
describe("SSR error boundary", () => {
  it("preserves a successful response and its headers", async () => {
    const response = new Response("ok", { headers: { "x-fixture": "retained" } });
    mocks.fetch.mockResolvedValue(response);
    expect(await request()).toBe(response);
  });
  it("renders a safe recovery page without logging or returning exception contents", async () => {
    mocks.fetch.mockRejectedValue(new Error("synthetic-private-secret"));
    const response = await request();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("synthetic-private-secret");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("Eventora SSR request failed");
  });
  it("normalizes swallowed framework errors into a usable HTML recovery page", async () => {
    mocks.fetch.mockResolvedValue(
      Response.json({ unhandled: true, message: "HTTPError" }, { status: 500 }),
    );
    const response = await request();
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("Go home");
  });
});
