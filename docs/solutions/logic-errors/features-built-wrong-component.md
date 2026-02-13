---
title: "Image management features deployed to wrong component (Hot Sheet vs Top SKUs)"
date: 2026-02-12
problem_type: logic-error
severity: high
component: components/product-card.tsx
tags:
  - component-mismatch
  - feature-placement
  - product-card
  - sku-section
  - image-management
  - remove-bg
  - image-search
  - context-verification
symptoms:
  - "User reported features not working despite successful deployment"
  - "Changes deployed to /hot-sheet while user tested on /"
  - "User screenshots showed original Top SKUs ProductCard without new features"
  - "Search magnifying glass only visible when hasImage=false — disappeared after image set"
  - "No manual background removal available on existing product images"
  - "No image clearing option without deleting entire SKU card"
---

# Image Management Features Deployed to Wrong Component

## Problem

User requested three image management features for the Top SKUs preview cards at `/`:
1. **Search for replacement images** when a card already has an image
2. **Manual remove-bg** trigger for existing images
3. **Clear image** without removing the entire SKU

Features were built on `components/hot-sheet/sku-section.tsx` (Hot Sheet editor at `/hot-sheet`) instead of `components/product-card.tsx` (Top SKUs page at `/`). User kept reporting "something still doesn't seem to be working" because they were testing on `/` where no changes existed.

## Root Cause

Context mismatch between the developer's understanding and the user's testing environment. The user said "preview section" referring to the **Preview** section on the Top SKUs page (`/`), which renders `ProductCard` components via `CardGrid`. This was misinterpreted as the Hot Sheet editor's SKU section.

Both pages have similar SKU card UIs but are entirely separate component trees:
- **Top SKUs** (`/`): `app/page.tsx` → `CardGrid` → `ProductCard` → `ImageDropzone`
- **Hot Sheet** (`/hot-sheet`): `app/hot-sheet/page.tsx` → `SkuSection` (inline cards)

## Investigation Steps

1. **CSS visibility hypothesis** — Initial Hot Sheet implementation used `opacity-0 group-hover:opacity-100` icon buttons inside an `overflow-hidden` container. Replaced with visible text toolbar. User still reported features missing.

2. **Cloudflare CDN caching analysis** — Checked `s-maxage=31536000` header, verified deployed JS chunks matched build output, confirmed `cf-cache-status` and content-hashed filenames. Deployment was current and serving correct code.

3. **React state debugging** — Examined `handleRemoveBgManual` for stale closures, blob URL lifecycle (create/revoke), `useCallback` dependency arrays. All code was functionally correct.

4. **Screenshot validation (breakthrough)** — User sent screenshot showing `ProductCard` with "Replace" overlay and "Dyson Airwrap Complete" product. This was the original Top SKUs page, not the Hot Sheet editor.

5. **Component inspection** — Read `components/product-card.tsx` and found:
   - Search button gated by `!hasImage && !showSearch && sku.name.length >= 3` — hidden once image is set
   - "Replace" hover overlay only opens a file picker (`<input type="file">`), not image search
   - No clear-image or remove-bg actions existed on the component

## Working Solution

Three files modified to add image toolbar to `ProductCard`:

### `components/product-card.tsx`

Added `onClearImage` and `onRemoveBg` props. Rendered a text toolbar below the image when `hasImage` is true:

```tsx
{hasImage && (
  <div className="flex items-center gap-1.5">
    <button onClick={() => setShowSearch((v) => !v)}
      className="text-[10px] text-gray-400 hover:text-accent">
      Search
    </button>
    <span className="text-gray-200">·</span>
    {!sku.processedImage && !sku.isProcessingImage && (
      <>
        <button onClick={() => onRemoveBg(sku.id)}
          className="text-[10px] text-gray-400 hover:text-accent">
          Remove bg
        </button>
        <span className="text-gray-200">·</span>
      </>
    )}
    <button onClick={() => { onClearImage(sku.id); setShowSearch(false); }}
      className="text-[10px] text-gray-400 hover:text-red-400">
      Clear
    </button>
  </div>
)}
```

### `components/card-grid.tsx`

Added `onClearImage` and `onRemoveBg` to `CardGridProps` interface. Pass-through to each `ProductCard` instance.

### `app/page.tsx`

Added two handlers:

**`handleClearImage(id)`** — Aborts in-flight bg removal, revokes blob URLs for both `imageUrl` and `processedImage`, clears both fields and resets `isProcessingImage`.

**`handleRemoveBgManual(id)`** — Sets `isProcessingImage: true`, fetches the blob URL back to a `Blob`, converts to data URL via `FileReader`, calls `/api/remove-bg`, creates a new blob URL for the processed result.

## Prevention Strategies

### Verify the target component before building

When a user reports a UI issue or requests a feature, confirm the exact page and component before writing code:
- Ask for the URL they're testing on (`/` vs `/hot-sheet`)
- Request a screenshot showing the current state
- Reference the file path explicitly: "Building this in `components/product-card.tsx`"

### Use screenshots as validation checkpoints

Screenshots are the fastest way to resolve "which component?" ambiguity. In this case, the user's screenshot immediately revealed the mismatch after hours of debugging unrelated issues (caching, CSS, React state).

### Consider shared image management logic

The codebase now has duplicated image handling in two places:
- `app/page.tsx`: `handleImageSelected`, `handleClearImage`, `handleRemoveBgManual`
- `app/hot-sheet/page.tsx`: Same three handlers with slightly different implementations

A shared hook (`useSkuImageManagement`) could reduce this duplication and prevent feature divergence.

### Mark components with their page context

Add a comment at the top of each component file identifying where it's used:

```tsx
// components/product-card.tsx — renders on / (Top SKUs tool)
// components/hot-sheet/sku-section.tsx — renders on /hot-sheet (Hot Sheet editor)
```

## Related Documentation

- **`docs/solutions/integration-issues/gmail-base64-image-stripping-on-paste.md`** — Documents the Hot Sheet two-step export pipeline. Same image management patterns (blob URLs, remove-bg API) but for the Hot Sheet context.
- **`docs/plans/2026-02-12-feat-hot-sheet-canvas-editor-plan.md`** (Line 200) — Notes that Hot Sheet SKU section must "replicate handleImageSelected logic from app/page.tsx:51-93" — early signal that image management lives in both places.
- **`docs/plans/2026-02-11-feat-sku-input-image-ux-improvements-plan.md`** — Original plan for image features on the Top SKUs page. Documents the ProductCard, ImageDropzone, and ImagePanel architecture.
- **`docs/plans/2026-02-10-feat-image-search-suggestions-plan.md`** — Foundational image search feature (`ImagePanel`, `/api/suggest-images` with SerpAPI).
