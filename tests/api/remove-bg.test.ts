import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../app/api/remove-bg/route";

function requestWithBody(body: string, ip: string): Request {
  return new Request("http://localhost/api/remove-bg", {
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

test("remove-bg returns 502 when provider response shape is invalid", async () => {
  await withEnv("REMOVEBG_API_KEY", "test-key", async () => {
    await withMockedFetch(
      async () =>
        Response.json(
          { ok: true },
          { status: 200, headers: { "content-type": "application/json" } }
        ),
      async () => {
        const res = await POST(
          requestWithBody(
            JSON.stringify({ image_b64: "data:image/png;base64,AAA=" }),
            "10.0.1.1"
          )
        );

        assert.equal(res.status, 502);
        const body = (await res.json()) as { error: string };
        assert.equal(body.error, "Background removal failed");
      }
    );
  });
});

test("remove-bg returns 504 when provider request times out", async () => {
  await withEnv("REMOVEBG_API_KEY", "test-key", async () => {
    await withMockedFetch(
      async () => {
        throw new DOMException("Timed out", "TimeoutError");
      },
      async () => {
        const res = await POST(
          requestWithBody(
            JSON.stringify({ image_b64: "data:image/png;base64,AAA=" }),
            "10.0.1.2"
          )
        );

        assert.equal(res.status, 504);
        const body = (await res.json()) as { error: string };
        assert.equal(body.error, "Background removal timed out");
      }
    );
  });
});
