---
title: "feat: Improve SKU input, image suggestions, and overall UX"
type: feat
date: 2026-02-11
deepened: 2026-02-11
---

# Improve SKU Input, Image Suggestions, and Overall UX

## Enhancement Summary

**Deepened on:** 2026-02-11
**Research agents used:** TypeScript reviewer, Security sentinel, Performance oracle, Frontend races reviewer, Architecture strategist, Code simplicity reviewer, Best practices researcher, Framework docs researcher, Learnings researcher

### Key Improvements from Research
1. **SSRF protection** — proxy-image endpoint needs IP blocking, redirect prevention, and origin validation
2. **Memory management** — use object URLs instead of base64 data URLs in React state to prevent memory bombs
3. **Race condition fixes** — add cancellation map for in-flight BG removal, guard stream loading state
4. **Tailwind v4 `starting:` variant** — pure-CSS slide animations via `@starting-style`, no JS animation library needed
5. **Native `<dialog>` element** — built-in focus trapping, Escape handling, and accessibility for the panel
6. **remove.bg API specifics** — use `image_file_b64` field, `Accept: application/json`, `size: "preview"` on free tier
7. **Bounded concurrency** — cap NDJSON streaming to 3 concurrent fetches to fix race condition on `sent` counter
8. **React.memo** — wrap ProductCard to prevent cascade re-renders on every keystroke

### Existing Bugs to Fix During Implementation
- Object URLs from `removeBg` are never revoked (memory leak)
- `JSON.parse` in data-input.tsx has no runtime validation (unsafe wire data)
- `res.body!` and `lines.pop()!` use non-null assertions instead of guards
- `SuggestImagesResponse` and `SuggestImagesError` types are dead code
- `sent` counter in suggest-images route has a TOCTOU race condition
- Duplicated try/catch around `removeBg` in page.tsx and data-input.tsx

---

## Overview

Incremental polish of the SKU input flow across three workstreams: (1) image suggestion UX overhaul with a side panel, progressive loading, and pagination, (2) form UX polish with keyboard flow, validation, and visual feedback, and (3) server-side background removal via remove.bg API. Same single-page architecture, no structural rewrites.

## Problem Statement

The current add-SKU flow has several friction points:
- Image suggestions are cramped in a 3-column inline grid with low-res thumbnails
- No way to browse more than 6 images or refine results
- The form lacks keyboard flow, validation, and feedback on successful add
- Client-side BG removal via WebAssembly is slow/unusable on lower-end devices

## Proposed Solution

### Phase 1: Image Suggestions Overhaul

**New files:**
- `components/image-panel.tsx` — slide-out side panel for browsing image suggestions
- `app/api/proxy-image/route.ts` — server-side image proxy for full-res fetches (CORS bypass)

**Modified files:**
- `app/api/suggest-images/route.ts` — return `originalUrl` alongside thumbnail, increase target count to 15, fix `sent` counter race
- `types/suggest-images.ts` — add `originalUrl` field, remove dead types
- `components/data-input.tsx` — replace inline suggestion grid with panel trigger, fix unsafe JSON.parse, batch suggestion state updates
- `app/page.tsx` — wire up panel callbacks

#### 1a. Extend SerpAPI response with original URLs

SerpAPI's `images_results` includes an `original` field with the full-size image URL. Currently ignored.

**`types/suggest-images.ts`** — rewrite:
```typescript
export interface ImageSuggestion {
  dataUrl: string;       // base64 thumbnail (existing)
  originalUrl: string;   // full-res source URL (new)
  title: string;
}

// Add runtime validation (pattern from lib/storage.ts isValidSKU)
export function isImageSuggestion(v: unknown): v is ImageSuggestion {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.dataUrl === "string" &&
    typeof o.originalUrl === "string" &&
    typeof o.title === "string"
  );
}

// Remove SuggestImagesResponse and SuggestImagesError (dead code)
```

**`app/api/suggest-images/route.ts`** — changes:
- Increase `TARGET_COUNT` from 6 to 15 (overfetch 20)
- Include `original` URL in the NDJSON output alongside the base64 thumbnail
- Extract SerpAPI result type:
  ```typescript
  interface SerpImageResult {
    thumbnail: string;
    original?: string;
    title?: string;
  }
  ```
- **Fix `sent` counter race condition**: Replace `Promise.allSettled` with bounded concurrency pool (3 concurrent fetches). This also gives genuinely progressive delivery instead of burst delivery:
  ```typescript
  const stream = new ReadableStream({
    async start(controller) {
      let sent = 0;
      const queue = [...results];
      const workers = Array.from({ length: 3 }, async () => {
        while (queue.length > 0 && sent < TARGET_COUNT) {
          const r = queue.shift();
          if (!r) break;
          try {
            // ... fetch, validate, encode, enqueue
            sent++;
            controller.enqueue(/* ... */);
          } catch { /* skip */ }
        }
      });
      await Promise.allSettled(workers);
      controller.close();
    },
  });
  ```
- **Sanitize `title` field** from SerpAPI before sending to client (strip HTML entities)

#### 1b. Image proxy endpoint

**`app/api/proxy-image/route.ts`** — new POST endpoint.

### Research Insights: SSRF Protection (Critical)

The proxy endpoint is an SSRF vector. Must implement these defenses:

```typescript
function validateProxyUrl(rawUrl: string): URL | null {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }

  // HTTPS only
  if (url.protocol !== "https:") return null;

  // Block IP addresses (force DNS names only)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) return null; // IPv4
  if (url.hostname.startsWith("[")) return null; // IPv6

  // Block dangerous hostnames
  const blocked = ["localhost", "0.0.0.0", "metadata.google.internal"];
  if (blocked.includes(url.hostname)) return null;

  // Block private TLDs
  if (url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) return null;

  return url;
}
```

Additional requirements:
- Set `redirect: "error"` on fetch to prevent redirect-based SSRF
- Validate `Content-Type` of response BEFORE reading body
- Check `Content-Length` header before streaming (enforce 2MB cap)
- Stream response through (don't buffer) to minimize Worker memory usage
- Add `Cache-Control: public, max-age=3600` header so browser caches proxied images
- Add origin validation header check (reject requests not from our app)

#### 1c. Image suggestion side panel

**`components/image-panel.tsx`** — new component.

### Research Insights: Use Native `<dialog>` + Tailwind v4 `starting:` Variant

Use the native `<dialog>` element for built-in accessibility (focus trapping, Escape key, focus restoration). Use Tailwind v4's `starting:` variant for pure-CSS slide animation:

```tsx
// Simplified structure
<dialog
  ref={dialogRef}
  onClose={onClose}
  className="
    fixed inset-y-0 right-0 w-80 m-0 h-screen
    translate-x-full opacity-0
    open:translate-x-0 open:opacity-100
    starting:open:translate-x-full starting:open:opacity-0
    transition-all duration-300 ease-out
    sm:max-md:inset-x-0 sm:max-md:bottom-0 sm:max-md:top-auto
    sm:max-md:w-full sm:max-md:h-auto sm:max-md:max-h-[60vh]
    sm:max-md:translate-x-0 sm:max-md:translate-y-full
    sm:max-md:open:translate-y-0
    sm:max-md:starting:open:translate-y-full
  "
>
```

Key implementation details:
- Use `dialog.showModal()` for focus trapping; `dialog.close()` on selection
- **Panel state is self-contained** — owns its own fetch lifecycle, loading state, suggestions array. Exposes single `onImageSelected(dataUrl: string)` callback to parent. Do NOT lift panel state into `page.tsx`.
- `ref` as prop (React 19 — no `forwardRef` needed)
- Ref callback cleanup function (React 19) for any observers

Image grid:
- 2-column layout with larger thumbnails
- Click thumbnail → brief loading state → fetch full-res via `/api/proxy-image` → set as staged image → close panel
- If full-res fetch fails, fall back to the thumbnail data URL silently
- **Every fetch must use AbortController** (React 19 SSR pattern from docs/solutions)
- Cancel previous full-res fetch if user clicks a different thumbnail

Pagination:
- Initially show 5 images
- "More images" button reveals next 5 from already-fetched suggestions (client-side reveal)
- **Batch suggestion state updates** — accumulate suggestions per NDJSON chunk, flush in one `setSuggestions` call instead of one per thumbnail (reduces 15 re-renders to 3-5)
- Button hidden while streaming, hidden when all shown
- State resets on new query

Mobile (< 640px):
- Same `<dialog>` element, different Tailwind classes for bottom sheet positioning
- Min touch target 44x44px on "More images" button

#### 1d. Update DataInput

- Remove the inline 3-column suggestion grid and skeleton loaders
- Remove dead code: `suggestLoading`, `suggestError`, `lastQuery`, `suggestions` state (moves to ImagePanel)
- Add "Find images" button next to name field (visible when name has 3+ chars)
- Button opens the side panel
- On form submit: close panel, reset
- **Fix unsafe `JSON.parse`**: Use `isImageSuggestion()` type guard
- **Fix `res.body!`**: Guard with `if (!res.body) throw new Error("Empty response")`
- **Fix `lines.pop()!`**: Use `lines.pop() ?? ""`

#### 1e. Memory management (cross-cutting)

### Research Insights: Object URLs vs Base64 (Critical Performance)

Base64 data URLs in React state are a memory bomb: ~5.3MB per SKU (original + processed). 10 SKUs = 53MB in the JS heap. Every `setSkus()` call copies the array.

**Replace base64 data URLs with object URLs for in-memory display:**
- When receiving an image (from suggestion, drop, paste): convert to Blob, create `URL.createObjectURL(blob)`
- Store the short object URL string (~40 bytes) in SKU state, not the multi-MB base64 string
- The current `removeBg` in `lib/remove-bg.ts` already returns object URLs — extend this pattern consistently
- **Revoke object URLs on SKU removal and image replacement** to prevent memory leaks:
  ```typescript
  // In handleRemove:
  const sku = prev.find(s => s.id === id);
  if (sku?.processedImage) URL.revokeObjectURL(sku.processedImage);
  if (sku?.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(sku.imageUrl);
  ```
- Only convert to data URL at export time (in `lib/export-image.ts`)

#### 1f. Prevent re-render cascades

**Wrap `ProductCard` in `React.memo`** — currently every keystroke in any SKU's name field re-renders all ProductCards. This is the single highest-leverage render performance fix:

```typescript
export const ProductCard = React.memo(function ProductCard({ ... }: ProductCardProps) {
  // existing implementation
});
```

### Phase 2: Form UX Polish

**Modified files:**
- `components/data-input.tsx` — auto-focus, validation, keyboard flow
- `components/card-grid.tsx` — add animation on new card
- `app/page.tsx` — scroll-to-new-card behavior

#### 2a. Auto-focus and keyboard flow

- Auto-focus name field on mount when `skus.length === 0`
- After successful form submit, re-focus name field via ref
- **React 19 ref typing**: `const nameRef = useRef<HTMLInputElement>(null)` — always provide initial value (React 19 requirement from documented learnings)
- Add `min="0"` to MSRP and offer price inputs (block negatives)
- Natural tab order: name → MSRP → offer price → submit button (panel is separate, not in tab flow)

#### 2b. Inline validation

- Non-blocking warning when offer price > MSRP (both fields must have values)
- Triggered on blur of either price field
- Renders as small amber text below the price row: "Offer price is higher than MSRP"
- Does not block form submission — this is a hint, not an error
- **Validation state modeling** — use a record, not individual state variables:
  ```typescript
  type FieldName = "name" | "msrp" | "price";
  const [warnings, setWarnings] = useState<Partial<Record<FieldName, string>>>({});
  ```

#### 2c. Visual feedback on add

- New card in `CardGrid` gets a CSS entrance animation using Tailwind v4 `starting:` variant or `@keyframes`:
  ```css
  @theme {
    --animate-card-in: card-in 300ms ease-out;
  }
  @keyframes card-in {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
  }
  ```
- After adding, scroll the new card into view: `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`

### Phase 3: Server-Side Background Removal

**New files:**
- `app/api/remove-bg/route.ts` — proxy to remove.bg API

**Modified files:**
- `lib/remove-bg.ts` — rewrite to call server API instead of client-side WASM
- `app/page.tsx` — add cancellation map for in-flight BG removal
- `components/data-input.tsx` — simplify post-submit BG removal call
- `next.config.ts` — remove COOP/COEP headers (no longer needed without SharedArrayBuffer)
- `package.json` — remove `@imgly/background-removal` dependency

#### 3a. Remove.bg API endpoint

### Research Insights: remove.bg API Integration

**`app/api/remove-bg/route.ts`** — new POST endpoint:

```typescript
const REMOVEBG_URL = "https://api.remove.bg/v1.0/removebg";

export async function POST(req: Request) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Background removal not configured" }, { status: 501 });
  }

  const body = await req.json();
  if (!body.image_b64 || typeof body.image_b64 !== "string") {
    return Response.json({ error: "Missing image_b64" }, { status: 400 });
  }

  // Strip data URL prefix: "data:image/png;base64,AAAA..." -> "AAAA..."
  const raw = body.image_b64.replace(/^data:image\/\w+;base64,/, "");

  // Size check (base64 is ~4/3 of binary, max 12MB binary per remove.bg)
  if ((raw.length * 3) / 4 > 12_000_000) {
    return Response.json({ error: "Image too large" }, { status: 413 });
  }

  const res = await fetch(REMOVEBG_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",  // Returns { data: { result_b64: "..." } }
    },
    body: JSON.stringify({
      image_file_b64: raw,
      size: "preview",  // 0.25MP — uses fewer credits, smaller payload
      format: "png",
      channels: "rgba",
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 429) {
    return Response.json({ error: "Rate limited, try again later" }, { status: 429 });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return Response.json(
      { error: err?.errors?.[0]?.detail ?? "Background removal failed" },
      { status: res.status >= 500 ? 502 : res.status }
    );
  }

  const data = await res.json();
  return Response.json({ result_b64: `data:image/png;base64,${data.data.result_b64}` });
}
```

Key details:
- Use `image_file_b64` field (not multipart) — simpler, avoids FormData boundary handling
- Use `size: "preview"` (0.25MP) on free tier — sufficient for 160px export containers
- Request `Accept: application/json` so response includes `result_b64` field
- Env var: `REMOVEBG_API_KEY` (add to `.env.local` and `wrangler secret put REMOVEBG_API_KEY`)
- Map error codes to user messages: `unknown_foreground` → "Could not detect subject", 402 → "Monthly limit reached"

#### 3b. Rewrite client-side remove-bg

**`lib/remove-bg.ts`** — rewrite to call server API:
```typescript
export async function removeBg(imageDataUrl: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/remove-bg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_b64: imageDataUrl }),
    signal,
  });
  if (!res.ok) throw new Error("BG removal failed");
  const data = await res.json();
  return data.result_b64;
}
```

Note: now accepts an optional `AbortSignal` for cancellation support.

#### 3c. Add BG removal cancellation map

### Research Insights: Ghost SKU Race Condition (High Severity)

Currently, `removeBg` can write processed images to deleted or cleared SKUs. Add a cancellation map:

```typescript
// In page.tsx
const bgAbortMapRef = useRef<Map<string, AbortController>>(new Map());

const handleImageSelected = useCallback(async (id: string, dataUrl: string) => {
  // Cancel any prior BG removal for this SKU
  bgAbortMapRef.current.get(id)?.abort();
  const controller = new AbortController();
  bgAbortMapRef.current.set(id, controller);

  setSkus(prev => prev.map(s =>
    s.id === id ? { ...s, imageUrl: dataUrl, isProcessingImage: bgRemovalEnabled } : s
  ));

  if (bgRemovalEnabled) {
    try {
      const processed = await removeBg(dataUrl, controller.signal);
      if (controller.signal.aborted) return;
      setSkus(prev => prev.map(s =>
        s.id === id ? { ...s, processedImage: processed, isProcessingImage: false } : s
      ));
    } catch {
      if (controller.signal.aborted) return;
      setSkus(prev => prev.map(s =>
        s.id === id ? { ...s, isProcessingImage: false } : s
      ));
    } finally {
      bgAbortMapRef.current.delete(id);
    }
  }
}, [bgRemovalEnabled]);

// In handleClear:
for (const ctrl of bgAbortMapRef.current.values()) ctrl.abort();
bgAbortMapRef.current.clear();

// When toggling bgRemovalEnabled off:
for (const ctrl of bgAbortMapRef.current.values()) ctrl.abort();
bgAbortMapRef.current.clear();
```

This fixes: ghost writes to deleted SKUs, stale `bgRemovalEnabled` in flight, wrong processed image after undo-clear.

#### 3d. Remove client-side WASM infrastructure

- Uninstall `@imgly/background-removal` from dependencies (saves ~170KB from client JS bundle + eliminates ~40MB ONNX model runtime download)
- Remove COOP/COEP headers from `next.config.ts` (they only existed for SharedArrayBuffer). Removing them also fixes compatibility issues with some third-party image embeds.

#### 3e. Failure behavior

- If remove.bg API fails or times out, set `isProcessingImage: false` and keep the raw image
- No fallback to client-side processing — if the API is down, the user gets the original image
- The "Auto-remove backgrounds" toggle stays, but now controls whether the server API is called
- If `REMOVEBG_API_KEY` env var is missing, hide the toggle entirely (graceful degradation, same pattern as suggest-images)

## Acceptance Criteria

### Phase 1: Image Suggestions
- [ ] Side panel slides out from right when "Find images" is clicked
- [ ] Uses native `<dialog>` element with built-in focus trapping
- [ ] Panel shows 2-column grid of image thumbnails (larger than current)
- [ ] Clicking a thumbnail fetches full-res via proxy, sets as staged image
- [ ] Falls back to thumbnail if full-res fetch fails
- [ ] "More images" button reveals next 5 from pre-fetched results
- [ ] Panel closes on Escape, close button, image selection, or form submit
- [ ] Bottom sheet layout on mobile (< 640px)
- [ ] Proxy endpoint validates SSRF: blocks IPs, private hostnames, redirects
- [ ] Proxy adds `Cache-Control` header for browser caching
- [ ] Suggestion state updates are batched (not one setState per thumbnail)
- [ ] `JSON.parse` of NDJSON uses runtime type guard
- [ ] Images stored as object URLs in state, not base64 strings
- [ ] ProductCard wrapped in React.memo
- [ ] `sent` counter race condition fixed with bounded concurrency

### Phase 2: Form Polish
- [ ] Name field auto-focuses on mount (when no SKUs exist) and after adding a SKU
- [ ] Tab order flows naturally: name → MSRP → price → submit
- [ ] Amber warning appears when offer price > MSRP (non-blocking)
- [ ] Negative price values blocked via `min="0"`
- [ ] New card animates in with Tailwind v4 animation
- [ ] Grid scrolls to reveal new card

### Phase 3: Server-Side BG Removal
- [ ] `/api/remove-bg` endpoint proxies to remove.bg API using `image_file_b64` + JSON
- [ ] Uses `size: "preview"` to conserve free tier credits
- [ ] `REMOVEBG_API_KEY` env var required (graceful degradation if missing)
- [ ] Client calls server API with AbortSignal support
- [ ] Cancellation map prevents ghost writes to deleted/cleared SKUs
- [ ] Toggling BG removal off aborts all in-flight removals
- [ ] `@imgly/background-removal` removed from dependencies
- [ ] COOP/COEP headers removed from `next.config.ts`
- [ ] Object URLs revoked on SKU removal and image replacement

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| remove.bg free tier is 50 images/month | Use `size: "preview"` to conserve. Sufficient for MVP. Monitor and upgrade if needed. |
| SerpAPI `original` URLs may 404 | Proxy returns error, client falls back to thumbnail silently |
| Image proxy SSRF | Block IPs, private hostnames, redirects. Validate content-type. Enforce 2MB limit. Add origin check. |
| Image proxy abuse as open relay | Rate limiting via Cloudflare dashboard rules on `/api/*` routes |
| Memory pressure with many SKUs | Object URLs instead of base64 in state. Revoke on removal. |
| Ghost writes from stale BG removal | Cancellation map with AbortController per SKU |
| Side panel on edge-case viewports | Native `<dialog>` handles accessibility; test at 640px breakpoint |
| Re-render cascade on typing | React.memo on ProductCard |

## Implementation Order

Ship as 3 independent PRs in order:

1. **Phase 1** (image suggestions) — biggest UX impact, most files touched. Includes proxy, panel, memory management, React.memo, streaming fixes.
2. **Phase 2** (form polish) — small, self-contained, quick win.
3. **Phase 3** (BG removal) — requires new API key + Wrangler secret. Includes cancellation map, WASM removal, header cleanup.

Each phase is functional on its own. No phase depends on another.

## References

- Brainstorm: `docs/brainstorms/2026-02-11-sku-input-ux-improvements-brainstorm.md`
- Existing patterns: `docs/solutions/runtime-errors/react19-ssr-lifecycle-patterns.md` (AbortController, ref patterns, stale closures)
- Existing patterns: `docs/solutions/build-errors/html-to-image-hidden-element-export-failure.md` (export pipeline)
- SerpAPI docs: https://serpapi.com/google-images-api
- remove.bg API docs: https://www.remove.bg/api
- MDN @starting-style: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style
- Tailwind v4 starting variant: https://tailwindcss.com/docs/hover-focus-and-other-states
- React 19 ref as prop: https://react.dev/blog/2024/12/05/react-19
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
