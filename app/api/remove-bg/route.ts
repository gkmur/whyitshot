import { checkOrigin, rateLimit } from "@/lib/rate-limit";

const REMOVEBG_URL = "https://api.remove.bg/v1.0/removebg";

function isAbortLikeError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "AbortError" || err.name === "TimeoutError")
  );
}

export async function POST(req: Request) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  const limited = rateLimit("remove-bg", req, 5);
  if (limited) return limited;
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Background removal not configured" }, { status: 501 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("image_b64" in body) || typeof (body as { image_b64: unknown }).image_b64 !== "string") {
    return Response.json({ error: "Missing image_b64" }, { status: 400 });
  }

  const raw = (body as { image_b64: string }).image_b64.replace(
    /^data:image\/[a-z0-9.+-]+;base64,/i,
    ""
  );

  if ((raw.length * 3) / 4 > 12_000_000) {
    return Response.json({ error: "Image too large" }, { status: 413 });
  }

  try {
    const res = await fetch(REMOVEBG_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        image_file_b64: raw,
        size: "preview",
        format: "png",
        channels: "rgba",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 402) {
      return Response.json({ error: "Monthly limit reached" }, { status: 402 });
    }
    if (res.status === 429) {
      return Response.json({ error: "Rate limited, try again later" }, { status: 429 });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return Response.json(
        { error: (err as { errors?: { detail?: string }[] })?.errors?.[0]?.detail ?? "Background removal failed" },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const data: unknown = await res.json().catch(() => null);
    const result = (data as { data?: { result_b64?: unknown } } | null)?.data?.result_b64;
    if (typeof result !== "string" || result.length === 0) {
      return Response.json({ error: "Background removal failed" }, { status: 502 });
    }

    return Response.json({ result_b64: `data:image/png;base64,${result}` });
  } catch (err) {
    if (isAbortLikeError(err)) {
      return Response.json({ error: "Background removal timed out" }, { status: 504 });
    }
    return Response.json({ error: "Background removal failed" }, { status: 502 });
  }
}
