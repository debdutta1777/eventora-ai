import { PlannerError } from "./gemini.ts";

/** Enforce the byte limit while reading, including chunked requests without Content-Length. */
export async function readPlanningBody(request: Request, maxBytes = 10_000): Promise<string> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes)
    throw new PlannerError("invalid_request", "Request too large.", 413);
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return body + decoder.decode();
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new PlannerError("invalid_request", "Request too large.", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
