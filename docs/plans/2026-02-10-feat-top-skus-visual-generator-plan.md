---
title: "feat: Top SKUs Visual Generator"
type: feat
date: 2026-02-10
---

# Top SKUs Visual Generator

## Overview

A Next.js web app that replaces the manual Google Slides workflow for creating Top SKU product card visuals. Users paste SKU data from a spreadsheet, upload product images, get automatic background removal, see a live preview, and export a clean PNG ready to paste into buyer emails.

Zero external API costs — background removal and image export both run client-side.

## Problem Statement

The Customer Success team creates product card visuals for every offer sent to enterprise buyers (Sam's Club, Costco). The current workflow:

1. Open Google Slides template
2. Google search for product images
3. Manually remove backgrounds
4. Add product name, MSRP, offer price, % off for each SKU
5. Format and align everything
6. Screenshot the slide
7. Paste into email

This takes 20-40 minutes per offer and is the slowest part of the Hot Sheet process. The tool eliminates steps 1-6 entirely.

## Proposed Solution

A single-page web app with four zones:

```
┌─────────────────────────────────────────────┐
│  1. DATA INPUT                              │
│  [Paste from spreadsheet]  or  [Add SKU]    │
├─────────────────────────────────────────────┤
│  2. CARD EDITOR                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ [image]  │ │ [image]  │ │ [image]  │    │
│  │ drop img │ │ drop img │ │ drop img │    │
│  │          │ │          │ │          │    │
│  │ Name     │ │ Name     │ │ Name     │    │
│  │ MSRP $XX │ │ MSRP $XX │ │ MSRP $XX │    │
│  │ Price $X │ │ Price $X │ │ Price $X │    │
│  │ XX% Off  │ │ XX% Off  │ │ XX% Off  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────┤
│  3. EXPORT                                  │
│  [Download PNG]  [Copy to Clipboard]        │
└─────────────────────────────────────────────┘
```

### Core Flow

1. **Paste SKU data** — user copies columns from their spreadsheet (product name, MSRP, offer price), pastes into a text area. App parses tab-separated data and populates cards.
2. **Upload images** — drag-and-drop an image onto each card, or paste a URL. Background is automatically removed via client-side ML.
3. **Live preview** — styled HTML cards render in real-time as data and images are added. User can edit any field inline.
4. **Export** — click to download as PNG or copy to clipboard.

## Technical Approach

### Stack

| Tool | Purpose |
|------|---------|
| Next.js 15 (TypeScript) | App framework, static export possible |
| Tailwind CSS v4 | Styling |
| html-to-image | Client-side PNG export from styled HTML |
| @imgly/background-removal | Client-side ML background removal (free, no API) |

### File Structure

```
app/
├── layout.tsx                # Root layout
├── page.tsx                  # Main page — single-page app
├── globals.css               # Tailwind + custom styles
components/
├── data-input.tsx            # Paste area + manual entry form
├── product-card.tsx          # Single product card (image + data)
├── card-grid.tsx             # Grid layout wrapping product cards
├── image-dropzone.tsx        # Drag-drop image upload per card
├── export-controls.tsx       # Download PNG + Copy to Clipboard buttons
lib/
├── parse-tsv.ts              # Tab-separated value parser
├── remove-bg.ts              # @imgly/background-removal wrapper
├── export-image.ts           # html-to-image wrapper
types/
└── sku.ts                    # SKU data type definitions
```

### Key Type

```typescript
// types/sku.ts
interface SKU {
  id: string;
  name: string;
  msrp: number;
  offerPrice: number;
  units?: number;
  imageUrl?: string;        // original uploaded image
  processedImage?: string;  // after background removal (data URL)
}
```

### Implementation Phases

#### Phase 1: Data Input + Card Preview

Build the core layout: paste area that parses TSV data into cards, manual form for editing individual fields, responsive grid that shows 2-4 cards.

**Files:** `app/page.tsx`, `components/data-input.tsx`, `components/product-card.tsx`, `components/card-grid.tsx`, `lib/parse-tsv.ts`, `types/sku.ts`

**Done when:** User can paste tab-separated data and see styled product cards appear.

#### Phase 2: Image Upload + Background Removal

Add drag-and-drop image zones on each card. When an image is dropped, run @imgly/background-removal client-side. Show a loading state during processing (~2-5s). Display the processed image on a white background.

**Files:** `components/image-dropzone.tsx`, `lib/remove-bg.ts`

**Done when:** User can drop an image on a card and see it appear with background removed.

#### Phase 3: PNG Export

Wire up html-to-image to capture the card grid as a PNG. Two export options: download file and copy to clipboard (using `navigator.clipboard.write` with a Blob).

**Files:** `components/export-controls.tsx`, `lib/export-image.ts`

**Done when:** User can click "Download PNG" and get a clean image file matching the preview.

#### Phase 4: Polish

- Inline editing of card fields (click to edit name, price)
- Add/remove cards dynamically
- Drag to reorder cards
- Responsive layout (2-col on narrow screens, 3-4 col on wide)
- Empty state with clear instructions
- Error handling for failed background removal (show original image with option to retry)

## Acceptance Criteria

### Functional

- [x] User can paste tab-separated data (name, MSRP, price) and see cards populate
- [x] User can manually add/edit/remove individual SKU cards
- [x] User can drag-and-drop images onto each card
- [ ] User can paste image URLs as an alternative to drag-drop
- [x] Background removal runs automatically on uploaded images
- [x] User can skip background removal (use original image)
- [x] Live preview updates in real-time as data changes
- [x] PNG export downloads a clean image matching the preview
- [x] Copy-to-clipboard works for the PNG
- [x] % off MSRP calculates automatically from MSRP and offer price

### Non-Functional

- [x] Background removal completes in under 10 seconds per image
- [x] PNG export completes in under 3 seconds
- [x] Works in Chrome and Safari (primary browsers for the team)
- [x] No external API keys required to run
- [x] App loads in under 2 seconds

## Edge Cases

- **1 SKU** — single centered card, not a grid
- **5+ SKUs** — two rows, wrapping layout
- **No image uploaded** — show placeholder with "Drop image here"
- **Background removal fails** — show original image, offer retry or skip
- **Very long product names** — truncate with ellipsis, show full on hover
- **Prices with decimals** — format consistently ($167.44 not $167.4)
- **User pastes malformed data** — show error with expected format example

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| @imgly model download (~40MB) slow on first use | Cache model in browser, show progress bar during download |
| html-to-image CORS with external image URLs | Proxy external images through Next.js API route, or prefer uploaded images |
| Background removal quality varies | Allow user to skip BG removal and use original image |
| Large images slow down processing | Resize images client-side before BG removal (max 1024px) |

## References

- Brainstorm: `docs/brainstorms/2026-02-10-why-its-hot-brainstorm.md`
- SOP: `Why Its Hot SOP.pdf`
- [html-to-image](https://github.com/bubkoo/html-to-image) — client-side HTML to PNG
- [@imgly/background-removal](https://github.com/imgly/background-removal-js) — client-side ML background removal
