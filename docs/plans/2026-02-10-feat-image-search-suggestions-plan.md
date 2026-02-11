---
title: "Image Search Suggestions for Manual Add Form"
type: feat
date: 2026-02-10
---

## Enhancement Summary

**Deepened on:** 2026-02-10
**Sections enhanced:** 6
**Research agents used:** TypeScript reviewer, Performance oracle, Security sentinel, Simplicity reviewer, Frontend races reviewer, Architecture strategist, Pattern recognition specialist, React19 learnings, Context7 Next.js docs

### Key Improvements
1. Content-type allowlist on thumbnail fetch prevents XSS via data URL misinterpretation
2. Blur-then-submit race fix: abort in-flight suggestions on form submit
3. Fetch timeouts and size caps prevent unbounded server-side operations
4. Shared response type between API route and client prevents type drift

### Critical Race Condition Discovered
- **Blur fires before click** in DOM event ordering. User blurs name field → search fires → user clicks "Add SKU" → form resets → search resolves → stale suggestions appear on blank form. Fix: abort suggestion fetch at the start of `handleAddManual`.

---

# Image Search Suggestions for Manual Add Form

When a user types a product name in the manual "Add SKU" form, offer 3 suggested product images from Google Images (via SerpAPI) so they can pick one instead of manually uploading.

## Overview

The manual add form currently requires users to drag/drop, paste, or upload an image. This feature adds a "Suggest Images" flow: after the user types a product name, the app queries SerpAPI's Google Images endpoint through a Next.js API route, returns 3 thumbnail options, and lets the user click one to stage it. The existing ImageDropzone and bg-removal pipeline remain untouched — suggestions just set `stagedImage` the same way a manual upload does.

## Approach

### Architecture

```
[Name Input] --blur/button--> [Client fetch to /api/suggest-images]
                                        |
                                  [Next.js API route]
                                        |
                                  [SerpAPI Google Images]
                                        |
                                  [Fetch top 3 thumbnails server-side]
                                  [Validate content-type, cap size]
                                  [Convert to base64 data URLs]
                                        |
                                  [Return to client]
                                        |
                              [Render 3 clickable thumbnails]
                                        |
                              [User clicks one → setStagedImage(dataUrl)]
```

**Why server-side image fetch?** The existing pipeline (`stagedImage`, `removeBg`, `export-image`) operates on data URLs. SerpAPI thumbnail URLs are cross-origin and can't be fetched client-side due to CORS. The API route fetches the images and returns base64 data URLs, maintaining consistency with the rest of the app.

**Why SerpAPI?** User chose SerpAPI over Google Custom Search. It wraps Google Image search with a clean JSON API. Free tier: 100 searches/month, 50 req/hr — sufficient for a tool like this.

### Trigger behavior

- **On blur**: When the name field loses focus, auto-search if the name has 3+ characters and has changed since the last search. Read value from `e.target.value` (DOM truth), not React state, to avoid stale reads from batched updates.
- **Button**: A "Suggest product images" button as explicit fallback (primary trigger on mobile where blur is unreliable)
- **Debounce**: No debounce needed — blur fires once, not continuously. Button clicks are naturally rate-limited by the user.

### Graceful degradation

If `SERPAPI_KEY` env var is missing, the entire suggestion feature is hidden. The form works exactly as today. A new API route (`/api/suggest-images`) checks for the key and returns 501 if missing.

## Files to create

- [x] **types/suggest-images.ts** — Shared response types for API route and client
- [x] **app/api/suggest-images/route.ts** — Next.js API route that proxies SerpAPI, fetches top 3 thumbnails, converts to base64 data URLs, returns JSON
- [x] **.env.local** — Add `SERPAPI_KEY=<key>` (gitignored)

## Files to modify

- [x] **components/data-input.tsx** — Convert name input to controlled, add suggestion state/UI, add blur handler + button, render suggestion row, handle selection

## Implementation details

### Shared types: `types/suggest-images.ts`

```typescript
export interface ImageSuggestion {
  dataUrl: string;
  title: string;
}

export interface SuggestImagesResponse {
  images: ImageSuggestion[];
}

export interface SuggestImagesError {
  error: string;
}
```

### API route: `app/api/suggest-images/route.ts`

```typescript
import type { ImageSuggestion } from "@/types/suggest-images";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_THUMBNAIL_BYTES = 150_000; // 150KB cap

export async function POST(req: Request) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return Response.json({ error: "Image search not configured" }, { status: 501 });
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
  const query = ((body as { query: string }).query).trim();
  if (query.length < 3 || query.length > 200) {
    return Response.json({ error: "Query too short or too long" }, { status: 400 });
  }

  // 1. Call SerpAPI Google Images
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

  // 2. Fetch each thumbnail and convert to base64
  const resolved = await Promise.allSettled(
    results.map(async (r: { thumbnail: string; title?: string }) => {
      const imgRes = await fetch(r.thumbnail, {
        signal: AbortSignal.timeout(3000),
      });
      if (!imgRes.ok) return null;

      // Validate content-type
      const rawType = imgRes.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (!rawType || !ALLOWED_IMAGE_TYPES.has(rawType)) return null;

      // Cap size
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
    .filter((r): r is PromiseFulfilledResult<ImageSuggestion | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((img): img is ImageSuggestion => img !== null);

  return Response.json({ images });
}
```

### Research Insights — API Route

**Security (content-type injection):**
- SerpAPI thumbnail URLs point to third-party CDNs. A malicious content-type like `text/html` would create a data URL that browsers could interpret as HTML if opened outside an `<img>` context. The allowlist (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) prevents this. SVG is excluded because SVGs can contain embedded JavaScript.

**Performance (timeouts + size caps):**
- `AbortSignal.timeout(5000)` on SerpAPI call, `AbortSignal.timeout(3000)` on each thumbnail fetch. Bounds worst-case response time to ~8 seconds instead of unbounded.
- 150KB cap on thumbnail ArrayBuffer prevents oversized images from inflating the response payload. Typical SerpAPI thumbnails are 10-30KB.

**Type safety:**
- `req.json()` returns `Promise<any>`. Parse as `unknown` and validate before destructuring.
- `filter(Boolean)` doesn't narrow types in TypeScript. Use a type predicate: `(img): img is ImageSuggestion => img !== null`.
- `Promise.allSettled` tolerates individual thumbnail failures without rejecting the entire batch.

### Component changes: `data-input.tsx`

**New imports:**

```typescript
import { useEffect, useRef } from "react";
import type { ImageSuggestion } from "@/types/suggest-images";
```

**New state:**

```typescript
const [nameValue, setNameValue] = useState("");
const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
const [suggestLoading, setSuggestLoading] = useState(false);
const [suggestError, setSuggestError] = useState<string | null>(null);
const [lastQuery, setLastQuery] = useState("");
const suggestAbortRef = useRef<AbortController | null>(null);
```

**Blur handler (reads from DOM, not React state):**

```typescript
const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  const q = e.target.value.trim();
  if (q.length < 3 || q === lastQuery) return;
  fetchSuggestions(q);
};
```

**Fetch function (shared by blur + button):**

```typescript
const fetchSuggestions = async (query: string) => {
  suggestAbortRef.current?.abort();
  const controller = new AbortController();
  suggestAbortRef.current = controller;

  setSuggestLoading(true);
  setSuggestError(null);
  setLastQuery(query);

  try {
    const res = await fetch("/api/suggest-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    if (controller.signal.aborted) return;
    setSuggestions(data.images ?? []);
    if ((data.images ?? []).length === 0) {
      setSuggestError("No images found");
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    setSuggestError("Couldn't load suggestions");
  } finally {
    setSuggestLoading(false);
  }
};
```

**Selection handler:**

```typescript
const handleSuggestionClick = (dataUrl: string) => {
  setStagedImage(dataUrl);
};
```

**Suggestion row UI (between name input and ImageDropzone):**

```tsx
{(suggestLoading || suggestions.length > 0 || suggestError) && (
  <div className="space-y-1">
    <span className="text-[11px] text-gray-400">Suggested images</span>
    {suggestLoading ? (
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1/3 h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    ) : suggestError && suggestions.length === 0 ? (
      <p className="text-[10px] text-gray-300">{suggestError}</p>
    ) : (
      <div className="flex gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSuggestionClick(s.dataUrl)}
            className={`w-1/3 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
              stagedImage === s.dataUrl
                ? "border-accent"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <img src={s.dataUrl} alt={s.title} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    )}
  </div>
)}

{nameValue.trim().length >= 3 && suggestions.length === 0 && !suggestLoading && (
  <button
    type="button"
    onClick={() => fetchSuggestions(nameValue.trim())}
    className="text-[10px] text-gray-300 hover:text-accent transition-colors w-full text-center"
  >
    Suggest product images
  </button>
)}
```

**Name input changes:**

```tsx
<input
  name="name"
  value={nameValue}
  onChange={(e) => setNameValue(e.target.value)}
  onBlur={handleNameBlur}
  placeholder="Product Name"
  required
  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
/>
```

**Form reset updates (in handleAddManual, BEFORE async work):**

```typescript
const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  suggestAbortRef.current?.abort(); // Kill any in-flight suggestion search
  const form = e.currentTarget;
  const data = new FormData(form);
  const imageToProcess = stagedImage;
  const sku = createSKU({
    name: (data.get("name") as string) || "Untitled",
    msrp: parseFloat(data.get("msrp") as string) || 0,
    offerPrice: parseFloat(data.get("price") as string) || 0,
    imageUrl: imageToProcess ?? undefined,
    isProcessingImage: bgRemovalEnabled && !!imageToProcess,
  });
  onAddSingle(sku);
  form.reset();
  setStagedImage(null);
  setNameValue("");
  setSuggestions([]);
  setSuggestError(null);
  setSuggestLoading(false);
  setLastQuery("");

  if (bgRemovalEnabled && imageToProcess) {
    try {
      const processed = await removeBg(imageToProcess);
      onUpdate(sku.id, { processedImage: processed, isProcessingImage: false });
    } catch {
      onUpdate(sku.id, { isProcessingImage: false });
    }
  }
};
```

**Cleanup on unmount:**

```typescript
useEffect(() => {
  return () => { suggestAbortRef.current?.abort(); };
}, []);
```

### Race condition prevention

- **AbortController**: Each new search aborts the previous one (same pattern as `image-dropzone.tsx:81-83`)
- **Post-await abort checks**: After each `await` boundary in `fetchSuggestions`, check `controller.signal.aborted` before setting state. Prevents stale responses from overwriting fresh state.
- **Blur-then-submit race**: `handleAddManual` calls `suggestAbortRef.current?.abort()` as its first action, killing any in-flight suggestion fetch. This prevents stale suggestions from appearing on a reset form.
- **DOM value in blur handler**: `handleNameBlur` reads from `e.target.value` instead of React state to avoid stale reads from batched updates.
- **`lastQuery` guard**: Prevents redundant searches when blur fires without a name change. Trimmed before comparison to avoid whitespace-only re-searches.
- **Capture before clear**: `imageToProcess = stagedImage` captures the value before state reset — no stale closure issue.
- **Bg removal timing**: Background removal only fires on form submit (existing behavior), not on suggestion selection.
- **Explicit loading reset**: Form submit explicitly sets `suggestLoading = false` in case an aborted request's `finally` block races with the reset.

### Graceful degradation (no API key)

The "Suggest Images" button and blur handler call `/api/suggest-images`. If the key is missing, the route returns 501, which the client treats as a regular error → shows "Couldn't load suggestions" → user falls back to manual upload. The UI doesn't need to check for the key's existence.

## Acceptance Criteria

- [x] Shared types defined in `types/suggest-images.ts`
- [x] API route `/api/suggest-images` accepts a query, returns up to 3 images as base64 data URLs
- [x] API route returns 501 if `SERPAPI_KEY` is not configured
- [x] API route validates query (type, min 3 chars, max 200 chars)
- [x] API route validates content-type of thumbnails (image/* allowlist)
- [x] API route caps thumbnail size at 150KB
- [x] API route has timeouts on SerpAPI call (5s) and thumbnail fetches (3s)
- [x] Name input blur triggers image search (if 3+ chars, changed since last search)
- [x] Blur handler reads value from DOM (`e.target.value`), not React state
- [x] "Suggest product images" button triggers search explicitly
- [x] Loading state shows 3 skeleton placeholders
- [x] Suggestions render as a row of 3 clickable thumbnails
- [x] Clicking a suggestion sets it as the staged image
- [x] Selected suggestion gets a visual indicator (accent border)
- [x] User can still manually upload/drop/paste an image instead
- [x] Selecting a suggestion after manual upload replaces the staged image
- [x] Manual upload after selecting a suggestion replaces the staged image
- [x] Form submit aborts in-flight suggestion search before resetting state
- [x] Form reset clears suggestions, name value, staged image, loading, error, and lastQuery
- [x] AbortController cancels in-flight requests on re-trigger or unmount
- [x] Post-await abort checks prevent stale state updates
- [x] Error state shows inline message, does not block form usage
- [x] 0 results shows "No images found" message
- [x] Feature works without `SERPAPI_KEY` — form behaves as before, error is dismissible
- [x] Bg removal only fires on form submit, not on suggestion selection

## References

- SerpAPI Google Images endpoint: `GET https://serpapi.com/search.json?engine=google_images`
- SerpAPI response: `images_results[].thumbnail` (CDN URL), `images_results[].title`
- SerpAPI pricing: 100 searches/month free tier, 50 req/hr
- Existing fetch+abort pattern: `components/image-dropzone.tsx:68-107`
- Existing staged image flow: `components/data-input.tsx:19,33-43`
- Data URL pipeline: `stagedImage` → `createSKU({ imageUrl })` → `removeBg()` → `onUpdate()`
- Race condition docs: `docs/solutions/runtime-errors/react19-ssr-lifecycle-patterns.md`
- Next.js API route patterns: `Response.json()`, try/catch with proper status codes
