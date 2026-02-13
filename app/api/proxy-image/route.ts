import { checkOrigin, rateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BYTES = 2_000_000;

class PayloadTooLargeError extends Error {}

function isAbortLikeError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  );
}

async function readBodyWithLimit(res: Response, maxBytes: number): Promise<ArrayBuffer> {
  const reader = res.body?.getReader();
  if (!reader) return new ArrayBuffer(0);

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError("Image too large");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

function validateProxyUrl(rawUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) return null;
  if (url.hostname.startsWith("[")) return null;

  const blocked = ["localhost", "0.0.0.0", "metadata.google.internal"];
  if (blocked.includes(url.hostname)) return null;
  if (url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) return null;

  return url;
}

export async function POST(req: Request) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  const limited = rateLimit("proxy-image", req, 30);
  if (limited) return limited;

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("url" in body) || typeof (body as { url: unknown }).url !== "string") {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const validated = validateProxyUrl((body as { url: string }).url);
  if (!validated) {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(validated.toString(), {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return Response.json({ error: "Upstream error" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType || !ALLOWED_TYPES.has(contentType)) {
      return Response.json({ error: "Not an image" }, { status: 400 });
    }

    const contentLength = Number(res.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
      return Response.json({ error: "Image too large" }, { status: 413 });
    }

    const buffer = await readBodyWithLimit(res, MAX_BYTES);

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return Response.json({ error: "Image too large" }, { status: 413 });
    }
    if (isAbortLikeError(err)) {
      return Response.json({ error: "Fetch timed out" }, { status: 504 });
    }
    return Response.json({ error: "Fetch failed" }, { status: 502 });
  }
}
