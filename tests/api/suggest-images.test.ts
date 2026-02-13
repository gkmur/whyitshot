import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../app/api/suggest-images/route";

function requestWithBody(body: string, ip: string): Request {
  return new Request("http://localhost/api/suggest-images", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body,
  });
}

async function withMockedFetch(
  mockFetch: typeof fetch,
  run: () => Promise<void>
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function withEnv(
  key: string,
  value: string | undefined,
  run: () => Promise<void>
): Promise<void> {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;

  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}

test("suggest-images returns 400 for invalid JSON body", async () => {
  await withEnv("SERPAPI_KEY", "test-key", async () => {
    await withMockedFetch(
      async () => {
        throw new Error("fetch should not be called");
      },
      async () => {
        const res = await POST(requestWithBody("{", "10.0.2.1"));
        assert.equal(res.status, 400);
        const body = (await res.json()) as { error: string };
        assert.equal(body.error, "Invalid request");
      }
    );
  });
});

test("suggest-images returns 504 when upstream search times out", async () => {
  await withEnv("SERPAPI_KEY", "test-key", async () => {
    await withMockedFetch(
      async () => {
        throw new DOMException("Timed out", "TimeoutError");
      },
      async () => {
        const res = await POST(
          requestWithBody(JSON.stringify({ query: "air fryer" }), "10.0.2.2")
        );
        assert.equal(res.status, 504);
        const body = (await res.json()) as { error: string };
        assert.equal(body.error, "Search timed out");
      }
    );
  });
});
