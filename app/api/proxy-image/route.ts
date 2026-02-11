const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BYTES = 2_000_000;

function validateProxyUrl(rawUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) return null;
  if (url.hostname.startsWith("[")) return null;

  const blocked = ["localhost", "0.0.0.0", "metadata.google.internal"];
  if (blocked.includes(url.hostname)) return null;
  if (url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) return null;

  return url;
}

export async function POST(req: Request) {
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

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
      return Response.json({ error: "Image too large" }, { status: 413 });
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json({ error: "Image too large" }, { status: 413 });
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return Response.json({ error: "Fetch failed" }, { status: 502 });
  }
}
