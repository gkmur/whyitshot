import type { ImageSuggestion } from "@/types/suggest-images";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_THUMBNAIL_BYTES = 150_000;

export async function POST(req: Request) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Image search not configured" },
      { status: 501 }
    );
  }

  const body: unknown = await req.json();
  if (
    !body ||
    typeof body !== "object" ||
    !("query" in body) ||
    typeof (body as { query: unknown }).query !== "string"
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const query = (body as { query: string }).query.trim();
  if (query.length < 3 || query.length > 200) {
    return Response.json(
      { error: "Query too short or too long" },
      { status: 400 }
    );
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);

  const serpRes = await fetch(url.toString(), {
    signal: AbortSignal.timeout(5000),
  });
  if (!serpRes.ok) {
    return Response.json({ error: "Search failed" }, { status: 502 });
  }

  const data = await serpRes.json();
  const results = (data.images_results ?? []).slice(0, 3);

  const resolved = await Promise.allSettled(
    results.map(async (r: { thumbnail: string; title?: string }) => {
      const imgRes = await fetch(r.thumbnail, {
        signal: AbortSignal.timeout(3000),
      });
      if (!imgRes.ok) return null;

      const rawType = imgRes.headers
        .get("content-type")
        ?.split(";")[0]
        ?.trim()
        .toLowerCase();
      if (!rawType || !ALLOWED_IMAGE_TYPES.has(rawType)) return null;

      const buffer = await imgRes.arrayBuffer();
      if (buffer.byteLength > MAX_THUMBNAIL_BYTES) return null;

      const base64 = Buffer.from(buffer).toString("base64");
      return {
        dataUrl: `data:${rawType};base64,${base64}`,
        title: r.title ?? "",
      };
    })
  );

  const images: ImageSuggestion[] = resolved
    .filter(
      (r): r is PromiseFulfilledResult<ImageSuggestion | null> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((img): img is ImageSuggestion => img !== null);

  return Response.json({ images });
}
