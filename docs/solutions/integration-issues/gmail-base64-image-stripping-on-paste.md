---
title: "Gmail strips inline base64 images from pasted text/html clipboard content"
date: 2026-02-12
problem_type: integration-issue
severity: medium
component: lib/hot-sheet-export.ts
tags:
  - gmail
  - clipboard-api
  - base64-images
  - text-html
  - ClipboardItem
  - html-to-image
  - export
  - two-step-export
symptoms:
  - "Pasted HTML in Gmail compose loses all inline base64 images"
  - "Images embedded as data URIs in text/html ClipboardItem are silently stripped by Gmail"
  - "Single ClipboardItem with both rich text and inline images renders as text-only in Gmail"
  - "Product card visuals missing after paste into Gmail compose window"
---

# Gmail Strips Inline Base64 Images from Pasted HTML

## Problem

When writing a `ClipboardItem` with `text/html` MIME type containing `<img src="data:image/png;base64,...">` tags, Gmail's web compose editor silently strips all images on paste. The text renders perfectly — images simply vanish. No error, no placeholder, no broken image icon.

```ts
// This DOES NOT work when pasted into Gmail compose
const html = '<div><p>Hello</p><img src="data:image/png;base64,iVBOR..."></div>';
const blob = new Blob([html], { type: "text/html" });
await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
```

This is intentional — Gmail sanitizes `data:` URIs to prevent large payloads, tracking pixels, and XSS vectors.

## Root Cause

Gmail's compose editor runs an aggressive HTML sanitizer on paste that removes:

- All `<img>` tags with `data:` URI `src` attributes
- `<style>` blocks and `<link>` tags
- `<script>`, `<iframe>` tags
- `background-image` in inline styles
- Most `display`, `position`, `float` CSS properties

It preserves: basic inline styles (`color`, `font-size`, `font-family`, `margin`, `padding`, `border`), `<table>` layouts, and `<img>` tags with real `https://` URLs.

## Investigation Steps

1. **Single `ClipboardItem` with `text/html` containing `<img src="data:...">` tags** — Text rendered, images silently stripped. Works in Google Docs, Notion, and most rich text editors — but not Gmail.

2. **Single `ClipboardItem` with both `text/html` and `image/png` MIME types** — Gmail reads the `text/html` representation (ignoring `image/png`), so images are still stripped from the HTML.

3. **Multiple `ClipboardItem` objects in a single `write()` call** — Gmail picks one representation to paste, not both. No combined result.

4. **Two separate clipboard operations (the working solution)** — Copy text and copy image as distinct user actions. Each operation writes exactly one content type that Gmail handles correctly.

## Working Solution: Two-Step Clipboard Export

Split the export into two separate clipboard operations. Users paste text first, then paste the image separately.

### Step 1: Build rich text HTML (no images)

`buildHotSheetHTML()` in `lib/hot-sheet-export.ts` constructs HTML with inline styles. All CSS is inline (Gmail strips `<style>` blocks). Empty sections are omitted. The Top SKUs section is rendered as **text-only** (name, prices, discount) — no `<img>` tags.

```ts
export function buildHotSheetHTML(sheet: HotSheet): string {
  const sections: string[] = [];
  // Build sections with inline styles, guard each by emptiness check
  // ...
  return `<div style="font-family:Inter,system-ui,sans-serif;...">${sections.join("")}</div>`;
}
```

### Step 2: Write rich text to clipboard

```ts
export async function copyTextToClipboard(sheet: HotSheet): Promise<void> {
  const html = buildHotSheetHTML(sheet);
  const blob = new Blob([html], { type: "text/html" });
  await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
}
```

### Step 3: Build SKU grid as PNG via append-capture-remove

`buildSkuGridPNG()` creates a temporary DOM element, appends it to `document.body` (required for `html-to-image`), captures with `toPng()`, then removes it.

```ts
export async function buildSkuGridPNG(skus: HotSheetSKU[]): Promise<string> {
  const el = buildSkuGridDOM(skus);
  document.body.appendChild(el);
  await waitForImages(el);
  try {
    return await toPng(el, { pixelRatio: 2, backgroundColor: "#ffffff" });
  } finally {
    document.body.removeChild(el);
  }
}
```

### Step 4: Write PNG image to clipboard

```ts
export async function copySkuImageToClipboard(skus: HotSheetSKU[]): Promise<void> {
  const dataUrl = await buildSkuGridPNG(skus);
  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
```

Gmail accepts `image/png` clipboard items and inserts them as inline images in compose.

### UI: Two distinct buttons

`components/hot-sheet/export-controls.tsx` provides a fixed bottom bar with:

- **"Copy Text"** (primary): Writes rich HTML via `text/html` ClipboardItem
- **"Copy SKU Image"** (secondary): Writes PNG via `image/png` ClipboardItem

Both show loading spinners and brief "Copied!" confirmation.

## Prevention Strategies

### Design for the constraint from the start

- Default to two-step export for any clipboard-to-email feature. Don't treat it as a fallback.
- If single-paste is required, images must be hosted at real HTTPS URLs — not embedded as base64.
- Consider whether clipboard is even the right mechanism, or if a Gmail API / mailto approach is better.

### Build a compatibility matrix early

Before implementing clipboard-to-external-app features, test these email clients:

| Target | Strips `data:` URIs | Accepts `image/png` paste | Strips `<style>` blocks |
|--------|---------------------|---------------------------|------------------------|
| Gmail Web | Yes | Yes (standalone) | Yes |
| Outlook Web | Yes | Yes (standalone) | Yes |
| Outlook Desktop | Partial | Yes | Less aggressive |
| Apple Mail | No | Yes | Minimal |

### Treat email compose windows as hostile paste targets

- All `<style>`, `<script>`, `<link>`, `<iframe>` will be removed
- Only basic inline styles survive
- `data:` URIs in `src` attributes will be removed
- `background-image` in inline styles will be removed
- External URLs may be proxied (Gmail uses `googleusercontent.com`)

### Automated checks

```ts
// Verify clipboard HTML does not contain data URIs
test('clipboard HTML should not contain data URIs', () => {
  const html = buildHotSheetHTML(sheet);
  expect(/<img[^>]+src=["']data:/i.test(html)).toBe(false);
});

// Verify only inline styles (no <style> blocks)
test('clipboard HTML should use only inline styles', () => {
  const html = buildHotSheetHTML(sheet);
  expect(html).not.toContain('<style');
  expect(html).not.toContain('<link');
});
```

## Related Documentation

- **html-to-image gotchas**: `docs/solutions/build-errors/html-to-image-hidden-element-export-failure.md` — Documents the append-capture-remove pattern used by `buildSkuGridPNG()`
- **Existing export module**: `lib/export-image.ts` — Original Top SKUs PNG export that the hot-sheet export was adapted from
- **Blob utilities**: `lib/blob-url.ts` — `dataUrlToBlob()` converts base64 data URLs to proper Blob objects
- **Feature plan**: `docs/plans/2026-02-12-feat-hot-sheet-canvas-editor-plan.md` — Phase 2 spec, risk analysis (line 247) documents this as "High" likelihood
- **Brainstorm**: `docs/brainstorms/2026-02-12-hot-sheet-canvas-editor-brainstorm.md` — Initial identification of Gmail clipboard handling as a design constraint
