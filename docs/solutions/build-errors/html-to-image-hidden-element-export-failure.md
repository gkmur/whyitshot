---
title: "html-to-image toPng fails with empty error on hidden/offscreen elements"
date: 2026-02-10
category: build-errors
tags:
  - html-to-image
  - next-js
  - dom-cloning
  - png-export
  - css-positioning
component:
  - lib/export-image.ts
  - components/export-controls.tsx
severity: high
symptoms:
  - "Empty error object {} thrown by toPng"
  - "No PNG generated, export button appears to work but nothing downloads"
  - "Console shows: Export failed: {}"
---

# html-to-image toPng Fails on Hidden/Offscreen Elements

## Problem

When using `html-to-image` (`toPng`) to export a styled product card grid as PNG, the export failed silently with an empty error object `{}`. No PNG was generated.

The app had a dual-render pattern: editable cards visible to the user, and a separate "clean" React component hidden offscreen for export capture.

## Symptoms

- Clicking "Download PNG" showed a spinner, then logged `Export failed: {}`
- No file download triggered
- Error object was empty — no stack trace, no message

## Investigation

### Attempt 1: Fixed positioning offscreen
```tsx
<div className="fixed left-[-9999px] top-0">
  <CardGridExport skus={skus} exportRef={exportRef} />
</div>
```
**Result:** `toPng` threw empty error. `html-to-image` clones the DOM and re-renders it — fixed elements at extreme negative offsets break this cloning process.

### Attempt 2: Overflow hidden with zero dimensions
```tsx
<div className="overflow-hidden h-0 w-0" aria-hidden="true">
  <CardGridExport skus={skus} exportRef={exportRef} />
</div>
```
**Result:** Same error. The container collapses the element to zero dimensions — nothing to capture.

### Attempt 3: Retry with delay
Added 200ms delay between attempts thinking images needed time to load. Still failed on both attempts because the underlying visibility problem was unchanged.

## Root Cause

`html-to-image` needs actual visible DOM elements with determinable layout to capture them. It clones the target element and re-renders it into an SVG foreignObject. When the element has zero dimensions (collapsed container) or is positioned at extreme fixed offsets, the clone has no meaningful layout information and the render fails.

The error is an empty object `{}` because html-to-image catches internal errors poorly — it doesn't surface what actually went wrong.

## Solution

Stop using a hidden React component. Instead, build a plain DOM element with inline styles imperatively, append it to `document.body` temporarily, capture it, then remove it.

```typescript
// lib/export-image.ts

function buildExportHTML(skus: SKU[]): HTMLDivElement {
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:0;top:0;background:#fff;padding:32px;font-family:Inter,system-ui,sans-serif;";

  const cols = skus.length === 1 ? 1 : skus.length === 2 ? 2 : 3;
  const grid = document.createElement("div");
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:32px;`;

  for (const sku of skus) {
    // Build card with inline styles...
    // (product image, name, pricing, discount)
  }

  container.appendChild(grid);
  return container;
}

export async function exportToPng(skus: SKU[]): Promise<void> {
  const el = buildExportHTML(skus);
  document.body.appendChild(el);

  await new Promise((r) => setTimeout(r, 100)); // Let images load

  try {
    const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: "#fff" });
    const link = document.createElement("a");
    link.download = "top-skus.png";
    link.href = dataUrl;
    link.click();
  } finally {
    document.body.removeChild(el); // Always clean up
  }
}
```

**Why this works:** The element is briefly appended to `document.body` with real dimensions and inline styles. `html-to-image` can measure and clone it. The `finally` block ensures cleanup even if capture fails. The element is never visible to the user (it's at `position:absolute;left:0;top:0` and removed in milliseconds).

**Key pattern:** All styles are inline (`style.cssText`), not Tailwind classes. This avoids any dependency on stylesheets being loaded during the clone/render process.

## What Changed

| Before | After |
|--------|-------|
| Hidden React component with `exportRef` | No hidden component — DOM built on demand |
| Tailwind classes on export element | Inline styles only |
| `ExportControls` received `exportRef` | `ExportControls` receives `skus` array |
| `CardGridExport` component existed | Deleted — no longer needed |

Files modified:
- `lib/export-image.ts` — rewrote to use imperative DOM building
- `components/export-controls.tsx` — changed props from `exportRef` to `skus`
- `app/page.tsx` — removed `exportRef`, `CardGridExport`, hidden container div
- `components/card-grid.tsx` — removed `CardGridExport` export

## Prevention

1. **Never hide html-to-image targets with CSS** — no `display:none`, `visibility:hidden`, fixed offscreen, or zero dimensions
2. **Use the append-capture-remove pattern** — build element, append to body, capture, remove in `finally`
3. **Use inline styles for export elements** — don't rely on CSS classes that may not resolve during cloning
4. **Validate before capture** — check `getBoundingClientRect().width > 0` before calling `toPng`
5. **Fail loudly** — the empty `{}` error is a known html-to-image issue. Always surface failures to the user.

## Related

- Feature plan: `docs/plans/2026-02-10-feat-top-skus-visual-generator-plan.md`
- [html-to-image GitHub](https://github.com/bubkoo/html-to-image)
