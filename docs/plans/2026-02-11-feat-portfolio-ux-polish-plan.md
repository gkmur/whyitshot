---
title: "feat: Portfolio UX polish — empty state, interactions, and page choreography"
type: feat
date: 2026-02-11
brainstorm: docs/brainstorms/2026-02-11-portfolio-ux-polish-brainstorm.md
deepened: 2026-02-11
---

# Portfolio UX Polish

## Enhancement Summary

**Deepened on:** 2026-02-11
**Research agents used:** frontend-design, typescript-reviewer, performance-oracle, simplicity-reviewer, frontend-races-reviewer, architecture-strategist, next-js-react-docs, pattern-recognition, best-practices-researcher

### Key Improvements from Research
1. **Dramatically simplified animation architecture** — CSS `animation-delay` from index replaces Map/Set rearchitecture
2. **Restrained hover scale** — `scale-[1.008]` not `1.02`, dual-layer shadows for depth without cartoon feel
3. **Blob URLs over base64** — ~400KB heap savings for sample data images
4. **Race condition prevention** — functional `setSkus`, delayed auto-focus, drag transition suppression
5. **Safari a11y fix** — `1ms` not `0.01ms` for `prefers-reduced-motion`

## Overview

Make "Why It's Hot" immediately inviting to portfolio visitors. The goal: someone lands on the app and thinks "I want to try this" within 10 seconds. Five targeted improvements that address the dead empty state, static preview, and lack of visual energy.

## Problem Statement

The app's core functionality is strong (drag reorder, inline editing, BG removal, image suggestions, export). But the *invitation* to use it is weak:

1. **Empty state is dead** — blank form + icon + "No SKUs yet". No preview of what the tool produces.
2. **Input flow feels like work** — traditional form layout doesn't invite play.
3. **Preview feels static** — card grid works but lacks energy and delight.

Portfolio visitors bouncing on the empty state never discover the good stuff.

## Proposed Solution

Five changes, ordered by impact:

### 1. "Load Sample Data" Button + Sample Products

A prominent button in the empty state that loads 3 curated sample products with staggered card-in animation.

**Sample data strategy:**
- Bundle 3 small pre-processed PNG images (transparent background) in `/public/samples/`
- Products: Pick 3 visually distinctive consumer products with real-looking names and pricing
- On button click: fetch images from `/samples/*.png` (NOT `/public/samples/` — Next.js serves the public directory at root), convert to blob URLs via `URL.createObjectURL`, store as `processedImage` on each SKU
- Blob URLs are more memory-efficient than base64 data URLs (~400KB heap savings for 3 images)
- Sample data persists to localStorage like regular SKUs — but images are stripped on persist (matching existing behavior). On reload, sample products appear without images, same as manually-added ones

**Sample SKU definitions** — inline in `lib/sample-data.ts` (simple module with product definitions + async loader):
```typescript
const SAMPLE_PRODUCTS = [
  { name: "Sony WH-1000XM5", msrp: 399.99, offerPrice: 248.00, image: "/samples/sample-1.png" },
  { name: "Stanley Quencher H2.0", msrp: 45.00, offerPrice: 32.50, image: "/samples/sample-2.png" },
  { name: "Dyson Airwrap Complete", msrp: 599.99, offerPrice: 449.99, image: "/samples/sample-3.png" },
] as const;
```

**Loading flow:**
1. Fetch each PNG from `/samples/` path
2. Convert response blob to blob URL via `URL.createObjectURL(blob)`
3. Create SKUs with `processedImage` set to blob URL
4. Use functional state update: `setSkus(prev => [...prev, ...sampleSkus])` — prevents race with any manual additions

**Visibility rule:** Only when `skus.length === 0` (inside empty state block).

**Double-click guard:** Disable button after first click (set loading state), re-enable only if the empty state returns (e.g., after Clear All).

**Files:**
- `public/samples/sample-1.png`, `sample-2.png`, `sample-3.png` — pre-processed product images (~50-100KB each)
- `lib/sample-data.ts` — sample SKU definitions + async loader
- `app/page.tsx` — wire up button in empty state, call loader, set SKUs

### 2. Ghost Preview in Empty State

Static silhouette cards below the form showing what the output looks like before any SKUs are added.

**Implementation:**
- Static silhouettes (NOT pulsing skeletons) — `bg-gray-100 rounded-xl` without `animate-pulse`. Communicates structure without implying loading.
- 3 ghost cards with **varied dimensions** — different image area heights (140px, 160px, 150px) to look like real varied products, not a uniform template
- Responsive grid matching CardGrid breakpoints: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Ghost cards are NOT interactive — `pointer-events-none`, `select-none`, `opacity-40`
- Each ghost card: rounded image placeholder + two text-line placeholders (name + price)
- Renders inside the empty state block, below the "Load Sample Data" button

**Ghost-to-real transition:** Hard cut — when first SKU is added, the empty state block unmounts (React conditional rendering), and the real CardGrid renders with `card-in` animation. No deferred unmount — the simplicity is worth the instant swap.

**Files:**
- `components/ghost-preview.tsx` — pure presentational skeleton component (~25 lines)
- `app/page.tsx` — render ghost preview inside empty state

### 3. Quick-Add Bar Visual Refinement

Reduce visual weight of the DataInput form. NOT a structural redesign — the same fields, same logic, just lighter styling.

**Changes:**
- Softer borders on price inputs (`border-gray-100` instead of `border-gray-200`)
- Image dropzone: reduce border weight, use dotted instead of dashed, lighter gray
- Add button: pill-shaped (`rounded-full` instead of `rounded-lg`)

**NOT changing:**
- Form structure, field order, or progressive disclosure
- Image suggestion flow (ImagePanel still renders below name when triggered)
- Validation logic, debounce behavior, or any JS

**Files:**
- `components/data-input.tsx` — Tailwind class adjustments only

### 4. Card Hover/Interaction Polish

Restrained scale + dual-layer shadow on card hover. Smoother drag feedback.

**Hover effect:**
- Card wrapper: `hover:scale-[1.008] transition-transform transition-shadow duration-200`
- Dual-layer shadow: rest state `shadow-sm`, hover state `hover:shadow-md`
- NO `will-change-transform` — premature optimization for 3-9 cards, actually harms compositing
- NO `transition-all` — causes unintended property transitions (e.g., opacity during drag). Target only `transform` and `box-shadow`

**Drag polish:**
- During drag: keep existing `scale-105 opacity-70` but add `shadow-xl` for more depth
- Drop target: keep `ring-2 ring-accent/30` but add subtle `scale-[1.01]` to indicate receptiveness

**Hover + drag conflict resolution:** When a card is being dragged (`dragIndex === i`), suppress hover scale by conditionally applying hover classes only when `dragIndex === null`. Also suppress `transition-transform` during drag to prevent sluggish feel.

**Mobile/touch:** No hover effects on touch devices. `:hover` naturally doesn't fire on touch.

**Files:**
- `components/card-grid.tsx` — add hover classes to card wrapper, adjust drag styles

### 5. Page Load Animation

Staggered fade-in of page sections on initial load.

**Sections (in order):**
1. Header (0ms delay)
2. DataInput form (80ms delay)
3. Empty state / ghost preview OR Preview section (180ms delay)
4. Export controls (320ms delay, only if visible)

**Implementation:**
- CSS-only approach using `@keyframes fade-in-up` (opacity 0→1, translateY 12px→0)
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` — fast start, gentle deceleration
- Duration: 500ms per section
- Each section gets an inline `style={{ animationDelay: 'Xms' }}` and a shared class
- `animation-fill-mode: both` prevents FOUC

**Auto-focus timing:** Delay the DataInput auto-focus by 480ms (80ms delay + ~400ms animation) to prevent focusing an invisible input. Add `setTimeout` in the `useEffect` that handles `skuCount === 0`.

**SSR/hydration:** CSS-only with `animation-fill-mode: both` is hydration-safe — elements render invisible until the animation runs. Acceptable for a portfolio piece.

**Files:**
- `app/globals.css` — new `fade-in-up` keyframe + animation token
- `app/page.tsx` — add animation classes + delays to section wrappers

### 6. Accessibility: `prefers-reduced-motion`

All animations (existing `card-in` + new ones) respect user motion preferences.

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    transition-duration: 1ms !important;
  }
}
```

Note: `1ms` not `0.01ms` — Safari rounds sub-millisecond values unpredictably.

**Files:**
- `app/globals.css` — add at the end of the file

## Technical Considerations

**CardGrid animation — simplified approach:** Keep the existing `newId` string state for single-card additions. For staggered sample data (3 cards), use CSS `animation-delay` computed from the card's index: `style={{ animationDelay: '${i * 80}ms' }}`. The `useEffect` detects new cards by comparing current ID sets against previous IDs (stored in a ref), not by comparing `skus.length`. This handles both single additions and bulk sample data without any rearchitecture.

**Bundle size:** 3 sample PNGs at ~50-100KB each adds 150-300KB to the public folder. These are not in the JS bundle — they're fetched on demand when the button is clicked.

**Performance:** Ghost preview is pure CSS (no component tree, no event listeners). Card hover uses targeted `transition-transform transition-shadow` (not `transition-all`). Page load animations are CSS-only. No runtime JS overhead for any animation.

**Known existing issue (out of scope):** `DataInput` line 80 — fire-and-forget `removeBg` call without AbortController. Not introduced by this feature, flagged for future fix.

## Acceptance Criteria

- [x] Empty state shows ghost silhouette cards previewing the output layout
- [x] "Load sample data" button loads 3 products with staggered card animation
- [x] Sample products have images, names, and realistic pricing with visible discount badges
- [x] Sample data button is disabled after click, prevents double-load
- [x] Ghost preview disappears when first SKU is added
- [x] DataInput form has lighter visual weight (softer borders, pill button)
- [x] Product cards scale + shadow on hover (desktop only)
- [x] Drag interaction has enhanced shadow depth
- [x] Page sections fade in with staggered timing on initial load
- [x] All animations respect `prefers-reduced-motion: reduce`
- [x] No regressions in existing functionality (drag reorder, inline edit, export, image suggestions)

## Implementation Phases

### Phase 1: Foundation (animations + accessibility)
- Add `fade-in-up` keyframe and animation token to `globals.css`
- Add `prefers-reduced-motion` media query with `1ms` duration
- Update CardGrid `useEffect` to diff ID sets for new card detection

### Phase 2: Empty State (ghost preview + sample data)
- Create `components/ghost-preview.tsx` (static silhouettes)
- Create `lib/sample-data.ts` with sample SKU definitions + blob URL loader
- Add 3 sample product PNGs to `public/samples/`
- Wire up empty state in `page.tsx`: ghost preview + "Load sample data" button
- Delay auto-focus to after page animation completes

### Phase 3: Visual Polish (form + cards + page choreography)
- DataInput visual refinement (Tailwind class adjustments)
- Card hover/interaction polish in CardGrid (restrained scale, dual shadows, drag suppression)
- Page load stagger animation on section wrappers

## Dependencies & Risks

- **Sample product images:** Need 3 high-quality, transparent-background product PNGs. Can use royalty-free product photography or generate with AI.
- **CSS animation timing:** Stagger delays and easing curves require iteration. Values in this plan are starting points from research (Fibonacci-ish rhythm, deceleration curves).

## References

- Brainstorm: `docs/brainstorms/2026-02-11-portfolio-ux-polish-brainstorm.md`
- Current empty state: `app/page.tsx:211-234`
- Card animation: `components/card-grid.tsx:29-47` (newId tracking)
- Design tokens: `app/globals.css` (@theme block)
- SKU type: `types/sku.ts`
- Storage layer: `lib/storage.ts` (image stripping on persist)
- React 19 SSR patterns: `docs/solutions/runtime-errors/react19-ssr-lifecycle-patterns.md`
