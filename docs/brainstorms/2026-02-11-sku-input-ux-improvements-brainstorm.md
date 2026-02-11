# SKU Input & Image Suggestion UX Improvements

**Date:** 2026-02-11
**Status:** Brainstorm complete

## What We're Building

An incremental polish of the SKU input flow, image suggestion experience, and background removal pipeline. Same single-page architecture, upgraded interactions.

### Changes

1. **Image suggestion side panel** — Replace the inline 3-column thumbnail grid with a slide-out panel that opens alongside the form. Gives images more space without losing form context.

2. **Progressive image loading** — Show thumbnails first for fast browsing. When the user selects an image, fetch the full-resolution version from SerpAPI's `original` field. Resize/compress server-side to a usable size (~400-800px).

3. **"Load more" pagination** — Start with 5 image suggestions. Show a "More images" button at the bottom of the panel to fetch the next batch. No infinite scroll.

4. **Form UX polish**
   - Auto-focus name field on page load and after adding a SKU
   - Tab-through keyboard flow (name → MSRP → price → submit)
   - Inline validation (e.g. offer price > MSRP warning)
   - Animated card appearing in the preview grid on add
   - Graceful form clearing with visual success feedback

5. **Server-side background removal** — Move BG removal from client-side WebAssembly to a server API (Cloudflare Worker or external service). Eliminates device-dependent performance issues.

## Why This Approach

- **Incremental** — Each improvement is independent and shippable on its own
- **Low risk** — Same page structure, no architectural rewrite
- **Addresses all pain points** — Image quality (progressive loading), interaction (side panel + load more), form speed (keyboard flow + validation), and BG removal performance (server-side)

Rejected the wizard/step-flow approach — too many clicks for a quick tool, and a full rewrite isn't justified.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Image picker UI | Side panel (not modal or inline grid) | Browse images without losing form context |
| Image resolution | Progressive: thumbnails first, full-res on select | Fast browsing + quality output |
| Load more pattern | Explicit "More images" button | Simple, predictable, no scroll jank |
| BG removal | Server-side API | Consistent speed across devices |
| Input mode | Single-add only (no bulk/TSV) | Current use case doesn't need batch import |
| Export changes | None — just ensure correct dimensions | Export is already working well |

## Open Questions

- **Which server-side BG removal service?** Options: remove.bg API, Cloudflare Workers AI, self-hosted rembg. Need to evaluate cost/quality/speed.
- **Side panel behavior on mobile?** Full-screen overlay, or bottom sheet?
- **Should "load more" offset the SerpAPI query, or fetch more from the same result set?** Current API overfetches 12, shows 6. Could increase overfetch, or paginate the SerpAPI call.

## Scope

**In scope:**
- Image suggestion side panel
- Progressive image loading (thumbnail → full-res)
- Load more button
- Form auto-focus, tab flow, inline validation
- Add-SKU animation/feedback
- Server-side BG removal

**Out of scope:**
- Bulk/TSV import
- Export redesign
- Search query refinement UI
- Multiple image sources (just SerpAPI for now)
