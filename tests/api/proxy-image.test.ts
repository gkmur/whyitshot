import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../app/api/proxy-image/route";

function requestWithBody(body: string, ip: string): Request {
  return new Request("http://localhost/api/proxy-image", {
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

test("proxy-image returns 400 for invalid JSON body", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("fetch should not be called");
    },
    async () => {
      const res = await POST(requestWithBody("{", "10.0.0.1"));
      assert.equal(res.status, 400);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, "Missing url");
    }
  );
});

test("proxy-image returns 504 when upstream fetch times out", async () => {
  await withMockedFetch(
    async () => {
      throw new DOMException("Timed out", "TimeoutError");
    },
    async () => {
      const res = await POST(
        requestWithBody(
          JSON.stringify({ url: "https://example.com/image.png" }),
          "10.0.0.2"
        )
      );
      assert.equal(res.status, 504);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, "Fetch timed out");
    }
  );
});

test("proxy-image returns 413 when streamed response exceeds byte limit", async () => {
  const tooLargeChunk = new Uint8Array(2_000_001);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(tooLargeChunk);
      controller.close();
    },
  });

  await withMockedFetch(
    async () =>
      new Response(stream, {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    async () => {
      const res = await POST(
        requestWithBody(
          JSON.stringify({ url: "https://example.com/image.png" }),
          "10.0.0.3"
        )
      );
      assert.equal(res.status, 413);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, "Image too large");
    }
  );
});
