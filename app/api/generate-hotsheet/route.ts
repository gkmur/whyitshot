import { checkOrigin, rateLimit } from "@/lib/rate-limit";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a brand research assistant for a retail buying team. Given a brand name and retailer, produce a structured "Hot Sheet" — a concise sell-in document used to pitch the brand internally.

Your output must be factual and non-promotional. Write like a buyer's analyst, not a marketer. Cite sources where possible. If you're uncertain about specific numbers (revenue, TikTok stats), say "estimated" or omit rather than fabricate.

Respond with valid JSON matching this exact schema (no markdown fences, just raw JSON):

{
  "whyItsHot": "2-4 sentence brand story. What the brand does, why it's trending, key differentiators.",
  "distribution": "Where the brand is currently sold (DTC, Amazon, other retailers). Mention comparable/competing brands. Include Amazon revenue estimates if known.",
  "listingInfo": {
    "leadTime": "Typical lead time (e.g. '6-8 weeks') or empty string if unknown",
    "minOrderValue": "Minimum order value (e.g. '$5K') or empty string if unknown",
    "maxOrderValue": "Maximum order value or empty string if unknown",
    "availableForDotcom": false,
    "link": ""
  },
  "pressFeatures": [
    { "text": "Quote or headline from a press feature", "source": "Publication name", "url": "URL if known, otherwise omit" }
  ],
  "viralTiktoks": [
    { "description": "Brief description of a viral TikTok video about the brand", "stats": "View/like count if known, e.g. '2.4M views'" }
  ],
  "topSkus": [
    { "name": "Product name", "msrp": 0.00, "offerPrice": 0.00, "rating": "e.g. '4.8 stars on Amazon'", "reviewHighlight": "Short notable review quote or fact" }
  ]
}

Guidelines:
- pressFeatures: Include 2-4 real press mentions if they exist. Cite actual publications.
- viralTiktoks: Include 1-3 if the brand has viral TikTok presence. Omit if none known.
- topSkus: Include 3-6 best-selling or most notable products. Use real MSRPs when known. Set offerPrice to 0 (the buyer will fill this in).
- listingInfo: Most fields will be unknown — use empty strings. These are buyer-specific details.
- Keep whyItsHot to 2-4 sentences max.
- Keep distribution to 2-3 sentences max.`;

function sanitizeBrandName(raw: string): string {
  return raw.replace(/[^\w\s&'.,-]/g, "").trim().slice(0, 100);
}

export async function POST(req: Request) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  const limited = rateLimit("generate-hotsheet", req, 3);
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI generation not configured. Set ANTHROPIC_API_KEY." },
      { status: 501 }
    );
  }

  let brandName: string;
  let retailer: string;
  try {
    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as Record<string, unknown>).brandName !== "string" ||
      typeof (body as Record<string, unknown>).retailer !== "string"
    ) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    brandName = sanitizeBrandName((body as { brandName: string }).brandName);
    retailer = ((body as { retailer: string }).retailer || "").trim().slice(0, 50);
    if (brandName.length < 1) {
      return Response.json({ error: "Brand name is required" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const retailerContext = retailer ? ` for ${retailer}` : "";
  const userMessage = `Create a Hot Sheet for the brand "${brandName}"${retailerContext}. Return only valid JSON.`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error("Anthropic API error:", res.status, errText);
      return Response.json(
        { error: "AI generation failed" },
        { status: 502 }
      );
    }

    const data: unknown = await res.json();
    const content = (data as { content?: { type: string; text: string }[] })?.content?.[0];
    if (!content || content.type !== "text") {
      return Response.json({ error: "Unexpected AI response format" }, { status: 502 });
    }

    // Parse the JSON from the response text
    const jsonText = content.text.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse AI JSON:", jsonText.slice(0, 500));
      return Response.json({ error: "AI returned invalid JSON" }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return Response.json({ error: "AI generation timed out" }, { status: 504 });
    }
    console.error("Generate hotsheet error:", err);
    return Response.json({ error: "AI generation failed" }, { status: 500 });
  }
}
