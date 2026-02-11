import type { ImageSuggestion } from "@/types/suggest-images";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_THUMBNAIL_BYTES = 150_000;
const TARGET_COUNT = 15;
const OVERFETCH_COUNT = 20;
const CONCURRENCY = 3;

interface SerpImageResult {
  thumbnail: string;
  original?: string;
  title?: string;
}

function sanitizeTitle(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export async function POST(req: Request) {
  const limited = rateLimit("suggest-images", req, 10);
  if (limited) return limited;

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
    signal: AbortSignal.timeout(10000),
  });
  if (!serpRes.ok) {
    return Response.json({ error: "Search failed" }, { status: 502 });
  }

  const data = await serpRes.json();
  const results: SerpImageResult[] = (
    (data as { images_results?: SerpImageResult[] }).images_results ?? []
  ).slice(0, OVERFETCH_COUNT);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let sent = 0;
      const queue = [...results];

      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length > 0 && sent < TARGET_COUNT) {
          const r = queue.shift();
          if (!r) break;
          try {
            const imgRes = await fetch(r.thumbnail, {
              signal: AbortSignal.timeout(3000),
            });
            if (!imgRes.ok || sent >= TARGET_COUNT) continue;

            const rawType = imgRes.headers
              .get("content-type")
              ?.split(";")[0]
              ?.trim()
              .toLowerCase();
            if (!rawType || !ALLOWED_IMAGE_TYPES.has(rawType)) continue;

            const buffer = await imgRes.arrayBuffer();
            if (buffer.byteLength > MAX_THUMBNAIL_BYTES || sent >= TARGET_COUNT)
              continue;

            const base64 = Buffer.from(buffer).toString("base64");
            sent++;
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  dataUrl: `data:${rawType};base64,${base64}`,
                  originalUrl: r.original ?? "",
                  title: sanitizeTitle(r.title ?? ""),
                } satisfies ImageSuggestion) + "\n"
              )
            );
          } catch {
            // thumbnail fetch failed, skip
          }
        }
      });

      await Promise.allSettled(workers);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
