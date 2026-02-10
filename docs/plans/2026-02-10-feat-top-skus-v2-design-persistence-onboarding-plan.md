---
title: "feat: Top SKUs v2 — Design Refresh, Persistence, Onboarding & QoL"
type: feat
date: 2026-02-10
---

# Top SKUs v2 — Design Refresh, Persistence, Onboarding & QoL

## Enhancement Summary

**Deepened on:** 2026-02-10
**Sections enhanced:** 6 phases + security + architecture
**Research agents used:** TypeScript reviewer, Performance oracle, Security sentinel, Architecture strategist, Frontend races reviewer, Code simplicity reviewer, Best practices researcher, Context7 (Next.js 16, Tailwind CSS v4)

### Key Improvements
1. **Simplified persistence** — don't persist images at all, only text data. Eliminates image compression pipeline, QuotaExceededError handling, and stale thumbnail complexity.
2. **Simplified onboarding** — cut the tooltip overlay, keep only inline empty-state hints. The 3-section page is self-explanatory with good hints.
3. **SSRF hardening** — if image proxy is kept, it needs URL validation, private IP blocking, magic bytes verification, and SVG rejection.
4. **Undo/redo scoped down** — replace full state stack with simple "restore last cleared" to avoid Ctrl+Z conflicts with native text input undo.

### Tensions Surfaced
- **Simplicity vs. features**: The simplicity reviewer recommends cutting undo/redo, onboarding overlay, image proxy, and image persistence. These are all features Gabe explicitly requested. The plan keeps them but notes the simplest viable version of each.
- **Security vs. convenience**: Image proxy enables URL paste but introduces SSRF risk. Alternative: try client-side fetch first, show helpful error on CORS failure, skip the proxy entirely.

---

## Overview

Upgrade the Top SKUs Visual Generator with ghst.io design alignment (purple accent, TWK Lausanne typography, spacious layout), localStorage auto-save, interactive onboarding for new users, and quality-of-life features (undo/redo, drag reorder, image URL paste).

Design-first build order — visual refresh touches every component, so doing it first avoids rework.

## Problem Statement

The v1 app works but:
1. Uses a generic orange/gray palette that doesn't match the ghst.io brand
2. Loses all work on page refresh (no persistence)
3. Has no guidance for first-time users (brand partners, interns)
4. Lacks basic interaction patterns users expect (undo, reorder, URL paste)
5. Export images have inconsistent product image sizing

## Technical Approach

### Current State

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1.6 | App Router, client-only rendering |
| Styling | Tailwind CSS v4 | `@theme inline` tokens in globals.css |
| Export | html-to-image | Imperative DOM, inline styles, append-capture-remove |
| BG Removal | @imgly/background-removal | Client-side ML, ~40MB model |
| State | React useState | All in page.tsx, no persistence |

### Design Tokens (Current → Target)

Tailwind CSS v4 uses `@theme inline` with CSS custom properties. Colors defined here cascade to all utility classes automatically.

```css
@theme inline {
  --font-sans: var(--font-inter);
  --font-heading: var(--font-heading-face); /* TWK Lausanne or fallback */
  --color-accent: #564ef5;
  --color-accent-light: #eef0ff;
  --color-accent-hover: #4338ca; /* darker purple for hover states */
  --color-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-surface: #f9fafb;
}
```

### New Files

```
lib/
├── storage.ts          # localStorage read/write (text data only, no images)
├── use-autosave.ts     # Debounced auto-save hook
components/
├── (no new component files — onboarding is inline hints only)
```

### Modified Files

```
app/globals.css         # Theme tokens, font import
app/layout.tsx          # TWK Lausanne font loading
app/page.tsx            # Wire up auto-save, onboarding state
components/
├── data-input.tsx      # Purple accents, empty state hints
├── product-card.tsx    # Purple accents, drag handle, spacing
├── card-grid.tsx       # Drag reorder logic, spacing
├── image-dropzone.tsx  # Purple accents, URL paste input
├── export-controls.tsx # Purple accents
lib/
├── export-image.ts     # Uniform image dimensions, purple accent in output
```

## Implementation Phases

### Phase 1: Design System Foundation

Update theme tokens and font loading. Everything downstream inherits these.

- [x] Update `app/globals.css` — swap accent color to `#564ef5`, accent-light to `#eef0ff`, add `--color-accent-hover`, add `--font-heading` variable
- [x] Load TWK Lausanne in `app/layout.tsx` (check if available via Google Fonts or self-host; fallback: use `Sora` or `DM Sans` from Google Fonts as geometric sans alternative)
- [x] Update `app/page.tsx` header styling — purple accent, TWK Lausanne on `h1`
- [x] Increase section spacing from `space-y-8` to `space-y-12` on main, section padding to 40-60px

**Files:** `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
**Done when:** App loads with purple accent and new typography. No visual regressions in layout.

#### Research Insights

**Tailwind CSS v4 Theme Pattern (Context7):**
Use `@theme inline` to define custom colors that reference CSS variables. The `inline` modifier prevents Tailwind from generating utility classes for the custom properties — they're only used as values.

```css
@theme inline {
  --color-accent: #564ef5;
}
/* Then use: bg-accent, text-accent, border-accent, etc. */
```

**Font Loading:**
TWK Lausanne is a commercial font (Typewolf). It's likely self-hosted on ghst.io. Options:
1. Self-host the font files (if you have a license)
2. Use a Google Fonts fallback: **Sora** (geometric, similar weight range) or **DM Sans** (clean, modern)
3. Use `next/font/google` for optimized loading with zero layout shift

```typescript
import { Sora } from "next/font/google";
const sora = Sora({ subsets: ["latin"], variable: "--font-heading-face" });
```

---

### Phase 2: Component Visual Update

Sweep every component, replacing orange references and tightening spacing.

- [x] `components/data-input.tsx` — swap `orange-*` → accent classes, update tab indicator, focus rings, import button
- [x] `components/product-card.tsx` — swap `orange-*` focus borders, update remove button color to neutral, increase card padding
- [x] `components/card-grid.tsx` — update "Add SKU" button border hover to purple, increase gap
- [x] `components/image-dropzone.tsx` — swap drag highlight from `orange-400/orange-50` to purple, update spinner color
- [x] `components/export-controls.tsx` — update button styles (primary = accent purple bg)
- [x] Update border-radius to `rounded-2xl` (20px) on major containers (cards, input area, export section)

**Files:** All `components/*.tsx`
**Done when:** Every interactive element uses purple accent. No orange remains anywhere in the UI.

#### Research Insights

**Systematic Color Swap:**
There are 17 instances of `orange-*` classes across the component files. Use find-and-replace but verify each one — some orange values are inline hex in `export-image.ts` (`#ea580c`), not Tailwind classes.

Locations to update:
- `data-input.tsx`: `orange-600`, `orange-500`, `orange-50/50`, `orange-400`, `orange-500` (5 instances)
- `product-card.tsx`: `orange-400`, `orange-600` (2 instances)
- `image-dropzone.tsx`: `orange-400`, `orange-50` (3 instances)
- `export-controls.tsx`: no orange (uses `gray-900` primary)
- `export-image.ts`: `#ea580c` inline hex (1 instance)

---

### Phase 3: Export Refinement

Fix uniform image dimensions and align export styling with new design.

- [x] `lib/export-image.ts` — update `buildExportHTML` to use fixed image container (e.g., 160x160px) with `object-fit:contain` for all product images
- [x] Update export accent color from orange (`#ea580c`) to purple (`#564ef5`) in inline styles
- [x] Ensure all cards in export grid have identical total height regardless of text length (flex column with fixed sections)
- [x] Delete `ProductCardExport` from `components/product-card.tsx` (dead code from v1 refactor — still present at line 79)

**Files:** `lib/export-image.ts`, `components/product-card.tsx`
**Done when:** Export PNG shows all product images at identical dimensions. Cards are visually uniform.

#### Research Insights

**Security: innerHTML XSS in export-image.ts (Low Severity):**
The existing `buildExportHTML` function uses `innerHTML` at lines 46 and 55-56 to set pricing and discount text. The values come from `formatPrice()` and `percentOff()` which return formatted strings from numeric inputs, so user-controlled HTML injection is unlikely. However, if `sku.name` were ever rendered via innerHTML, it would be exploitable. Current code uses `textContent` for names (line 41), which is safe.

**Recommendation:** No change needed, but add a comment noting that `textContent` must be used for user-supplied strings and `innerHTML` is only safe for formatted numeric output.

**Uniform Card Height Pattern:**
Use a flex column with fixed-height sections:
```css
display:flex;flex-direction:column;align-items:center;height:280px;
/* Image section: fixed */
/* Text section: flex-grow with overflow hidden */
```

**html-to-image Gotcha (from docs/solutions):**
The append-capture-remove pattern is already implemented correctly. Key reminder: all styles must be inline (`style.cssText`), not Tailwind classes. The export element must have real dimensions. Validate `getBoundingClientRect().width > 0` before calling `toPng`.

---

### Phase 4: localStorage Auto-Save

Add persistence so sessions survive refresh.

- [x] Create `lib/storage.ts`:
  - Define `PersistedSKU` type (excludes `isProcessingImage`, excludes image data)
  - Define `SessionData` type with `version: 1` discriminant for future migrations
  - `saveSession(skus: SKU[]): boolean` — serialize text-only SKU data, return false on `QuotaExceededError`
  - `loadSession(): SKU[] | null` — parse from `unknown`, validate shape, return null on corruption
  - `clearSession(): void`
- [x] Create `lib/use-autosave.ts` — `useAutosave(skus: SKU[])` hook that debounces saves (500ms) via `useEffect`
- [x] Update `app/page.tsx`:
  - Load session on mount with `useState(() => loadSession() ?? [])`
  - Wire `useAutosave(skus)`

**Files:** `lib/storage.ts`, `lib/use-autosave.ts`, `app/page.tsx`
**Done when:** Refresh the page → SKU text data persists. Image slots are empty on restore (user re-uploads). Adding/removing SKUs triggers auto-save.

#### Research Insights

**Simplification: Don't persist images (Simplicity Reviewer):**
The original plan called for compressing images to thumbnails and storing them in localStorage. This creates a compression pipeline (`lib/image-utils.ts`), QuotaExceededError handling, and a "stale thumbnail" UX problem where restored images are too low-res for export.

**Better approach:** Only persist text data (name, msrp, offerPrice, units). On restore, show empty image slots. Users re-upload images in seconds. This eliminates:
- `lib/image-utils.ts` (entire file)
- QuotaExceededError edge case
- Stale thumbnail indicators
- localStorage quota concerns (text-only data is ~1KB per SKU)

**TypeScript: Use a distinct PersistedSKU type (TS Reviewer):**

```typescript
interface PersistedSKU {
  readonly id: string;
  readonly name: string;
  readonly msrp: number;
  readonly offerPrice: number;
  readonly units?: number;
  // No imageUrl, processedImage, or isProcessingImage
}

interface SessionData {
  readonly version: 1;
  readonly skus: readonly PersistedSKU[];
  readonly savedAt: string; // ISO timestamp
}
```

Add explicit conversion functions:
```typescript
function toPersistedSKU(sku: SKU): PersistedSKU;
function fromPersistedSKU(persisted: PersistedSKU): SKU;
```

**TypeScript: Validate parsed localStorage data:**

```typescript
function loadSession(): SKU[] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSessionData(parsed)) return null;
    return parsed.skus.map(fromPersistedSKU);
  } catch {
    return null;
  }
}
```

**Frontend Races: Auto-save debounce timing:**
500ms debounce is reasonable. Use `useEffect` with a cleanup function that cancels the pending timeout on unmount. In React 18+ strict mode, effects run twice in dev — ensure `loadSession` is idempotent (it is, since it's a pure read).

---

### Phase 5: Onboarding

Persistent empty state hints in key sections.

- [x] Add empty state hints to `components/data-input.tsx` — when no SKUs exist, show example format below the textarea: `"Example: Luka Duffel\t$299\t$167.44\t800"`
- [x] Add empty state hint to `components/card-grid.tsx` — when grid has cards but no images, show "Drag product images onto each card, or click to upload"
- [x] Add empty state hint to `components/image-dropzone.tsx` — improve the empty dropzone label from "Drop image" to "Drop image or paste URL"

**Files:** `components/data-input.tsx`, `components/card-grid.tsx`, `components/image-dropzone.tsx`
**Done when:** Empty sections show contextual guidance text. No tooltip overlay needed.

#### Research Insights

**Simplification: Cut the tooltip overlay (Simplicity Reviewer):**
The original plan had a full `OnboardingTooltip` component with pointer arrows, step counter, next/dismiss buttons, and an `OnboardingOverlay` manager. This is overbuilt for a 3-section single-page app.

Positioned tooltips are fragile (break on resize, viewport changes, target visibility). The app's linear layout (paste → cards → export) is already self-explanatory with good inline hints. The target users (brand partners, interns) will receive verbal or Slack instructions alongside the link.

**What we keep:** Inline empty-state hints are the high-value part — they're contextual, always visible when relevant, and zero-maintenance. No localStorage flag, no step management, no pointer positioning.

---

### Phase 6: Quality of Life

Three independent features.

#### 6a. Undo: Restore Last Cleared

- [x] Update `app/page.tsx`:
  - Before `handleClear`, save current `skus` to a `lastCleared` ref
  - Show "Undo" button (briefly, 5s timeout) after clear, which restores `lastCleared`
  - This covers the only truly destructive action without hijacking Ctrl+Z

**Files:** `app/page.tsx`
**Done when:** Clearing all SKUs shows a brief "Undo" option to restore them.

#### Research Insights (Undo/Redo)

**Simplification: Cut full undo/redo (Simplicity Reviewer):**
The original plan specified a full past/future state stack with 30 entries, keyboard shortcuts, and header buttons. This is overengineered because:
- The app has ~5 mutations (add, remove, update, import, clear). Most are trivially reversible.
- `Ctrl+Z` is a browser-native shortcut that already works in text inputs. Hijacking it at the page level conflicts with native undo in the textarea and editable fields.
- Users assemble 3-8 cards and export. They don't need 30 levels of undo.

**If full undo/redo is later needed**, the TypeScript reviewer recommends:
- `useHistory.set()` must accept updater functions `(prev: T) => T` (current `page.tsx` uses functional updates like `setSkus(prev => [...prev, ...imported])`)
- Use `useReducer` internally with a discriminated union action type
- Use `readonly` arrays for past/future stacks
- Cap enforcement belongs in the reducer, not at the call site

#### 6b. Drag to Reorder

- [x] Update `components/card-grid.tsx`:
  - Add drag handle (grip icon) to top-left of each card
  - Implement reorder via pointer events (pointerdown → track, pointermove → reorder, pointerup → commit)
  - On reorder, call a new `onReorder(fromIndex, toIndex)` callback
  - Visual feedback: dragged card gets slight scale + shadow, drop target shows insertion line
- [x] Update `app/page.tsx`:
  - Add `handleReorder` callback that splices the SKU array
  - Pass `onReorder` to CardGrid

**Files:** `components/card-grid.tsx`, `app/page.tsx`
**Done when:** User can drag a card to a new position. Order persists in export and auto-save.

#### Research Insights (Drag Reorder)

**Implementation pattern:** Use `pointerdown` on the drag handle to start tracking, `pointermove` to calculate position and update state, `pointerup` to commit. Key considerations:
- Set `touch-action: none` on the drag handle to prevent scroll interference on mobile
- Use `requestAnimationFrame` in the pointermove handler to avoid layout thrashing
- Track drag state in a ref (not state) to avoid re-renders on every pixel move — only update state on reorder threshold

**Frontend Races (Races Reviewer):**
Rapid drags can cause stale state if the reorder callback uses closure-captured state. Use functional updates: `setSkus(prev => reorder(prev, from, to))`.

#### 6c. Image URL Paste

- [x] Update `components/image-dropzone.tsx`:
  - Add a small "or paste URL" text link below the drop area
  - On click, show a text input that accepts a URL
  - On submit, attempt client-side `fetch(url)` first
  - If CORS blocks, show inline message: "Couldn't load that URL. Try downloading the image and dragging it here."
  - If fetch succeeds, convert response blob to data URL, pass to `onImageSelected`

**Files:** `components/image-dropzone.tsx`
**Done when:** User can paste a product image URL. CORS-blocked URLs show a helpful fallback message.

#### Research Insights (Image URL Paste)

**Simplification: Skip the server-side proxy (Simplicity Reviewer):**
The original plan created `app/api/proxy-image/route.ts` to avoid CORS. This adds server-side concerns (SSRF risk, abuse, rate limiting) to a client-only app. Most product images on public retailer sites allow cross-origin requests. For the ones that don't, a friendly error message ("Download the image and drag it here") is sufficient.

**If proxy is later needed (Security Sentinel):**
The proxy endpoint is an SSRF vector. Required hardening:
- URL scheme validation (https/http only)
- DNS resolution check to block private IPs (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x)
- `redirect: "error"` to prevent redirect-to-internal attacks
- Content-type validation against allowlist (reject SVGs — XSS vector)
- Magic bytes verification (confirm file header matches claimed content-type)
- AbortSignal timeout (10s)
- Response size cap (10MB) with streaming enforcement

```typescript
// Pattern for isPrivateIP check
function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}
```

---

## Acceptance Criteria

### Functional

- [ ] App uses ghst.io purple (#564ef5) accent throughout — no orange remains
- [ ] Headings use TWK Lausanne (or approved fallback font)
- [ ] Export PNG shows all product images at uniform dimensions
- [ ] SKU text data persists across page refresh via localStorage
- [ ] Empty sections show contextual guidance text
- [ ] "Clear all" shows brief "Undo" option to restore
- [ ] Cards can be reordered via drag
- [ ] Image URLs can be pasted as alternative to drag-drop upload

### Non-Functional

- [ ] Auto-save debounced (500ms) to avoid performance impact
- [ ] localStorage usage minimal (text-only, no images)
- [ ] No new npm dependencies for drag-and-drop (use pointer events)
- [ ] No new npm dependencies for onboarding (inline hints only)

## Edge Cases

- **localStorage corrupt** — `loadSession` validates shape via `isSessionData` check, returns null on invalid data
- **Drag reorder with 1 card** — disable drag, no handle shown
- **Image URL CORS blocked** — show inline message: "Couldn't load that URL. Try downloading the image and dragging it here."
- **Image URL returns 404** — show user-friendly error inline
- **Clear + undo timeout** — "Undo" button disappears after 5 seconds, cleared data is gone
- **React strict mode double-mount** — `loadSession` is idempotent (pure read), auto-save debounce cleans up on unmount

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| TWK Lausanne not freely available | Use Google Fonts fallback (Sora or DM Sans) via `next/font/google` |
| Drag reorder complexity | Use simple pointer events with `requestAnimationFrame`, not a library |
| Image URL CORS failures | Client-side fetch with graceful fallback message, no proxy needed |
| innerHTML in export-image.ts | Safe for formatted numbers; use `textContent` for user strings |

## References

- Brainstorm: `docs/brainstorms/2026-02-10-top-skus-v2-brainstorm.md`
- v1 Plan: `docs/plans/2026-02-10-feat-top-skus-visual-generator-plan.md`
- html-to-image export solution: `docs/solutions/build-errors/html-to-image-hidden-element-export-failure.md`
- ghst.io design reference: purple accent `#564ef5`, TWK Lausanne headings, Inter body, 20px border-radius, generous spacing
- Tailwind CSS v4 @theme docs: https://tailwindcss.com/docs/functions-and-directives
- Next.js 16 Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
