---
title: "feat: Hot Sheet Canvas Editor"
type: feat
date: 2026-02-12
brainstorm: docs/brainstorms/2026-02-12-hot-sheet-canvas-editor-brainstorm.md
---

# feat: Hot Sheet Canvas Editor

## Overview

Add a new `/hot-sheet` route — a single-page document editor where CS team members and interns assemble complete "Hot Sheet" sell-in documents for brands. AI generates a draft from a brand name + retailer, users edit inline, and export produces Gmail-ready formatted text plus a separate Top SKUs image for clipboard. The existing Top SKUs visual tool at `/` remains untouched.

## Problem Statement

Creating a Hot Sheet currently requires 5 tools (ChatGPT, Google Docs, Google Slides, image editors, Gmail) and takes 30-60 minutes per brand. Quality varies across team members. The app currently only handles one piece — the Top SKUs visual. The rest of the workflow is manual and fragmented.

## Proposed Solution

A document editor with all Hot Sheet sections visible at once. AI auto-fills every section from a brand name. Users edit inline, add/remove list items, and export the document as copyable rich text (plus a separate SKU image) for Gmail.

## Technical Approach

### Architecture

New route at `app/hot-sheet/page.tsx` following the existing single-page pattern: all state in the page component, passed down via props. No shared state with the existing `/` route.

```
app/
  hot-sheet/
    page.tsx              # Main page component (client)
    layout.tsx            # Metadata (server)
components/
  hot-sheet/
    brand-header.tsx      # Brand name + retailer selector
    prose-section.tsx     # Heading + auto-resizing textarea (Why It's Hot, Distribution)
    list-section.tsx      # Editable list (press, TikToks)
    listing-info.tsx      # Structured form fields
    sku-section.tsx       # Top SKUs grid (reuses ProductCard patterns)
    export-controls.tsx   # Export buttons + preview
types/
  hot-sheet.ts            # HotSheet interface + helpers
lib/
  format.ts               # Shared formatPrice, percentOff (extracted from types/sku.ts)
  hot-sheet-storage.ts    # localStorage with "hotsheet:session" key
  hot-sheet-export.ts     # Rich text + image export builder
app/api/
  generate-hotsheet/
    route.ts              # LLM-powered brand research generation
```

### Data Model

```typescript
// types/hot-sheet.ts

interface HotSheet {
  id: string;
  brandName: string;
  retailer: string;            // "Costco" | "Sam's Club" | custom
  whyItsHot: string;           // Prose paragraph
  distribution: string;        // Prose paragraph (channels + similar brands)
  listingInfo: ListingInfo;
  pressFeatures: PressQuote[];
  viralTiktoks: TiktokEntry[];
  topSkus: HotSheetSKU[];
  aiGenerated: boolean;        // Whether Generate was used (drives verify banner)
  createdAt: string;
  updatedAt: string;
}

interface ListingInfo {
  leadTime: string;            // Free text: "3-4 Months", "8 weeks"
  minOrderValue: string;       // Free text: "$10K", "TBD"
  maxOrderValue: string;       // Free text: "$500K", "Take All"
  availableForDotcom: boolean;
  link: string;                // URL to ACS/listing
}

interface PressQuote {
  id: string;
  text: string;                // Quote or headline
  source: string;              // Publication name
  url?: string;                // Link to article
}

interface TiktokEntry {
  id: string;
  description: string;         // Video description
  stats: string;               // "2.4M views", "340K likes & 2.5M views"
}

interface HotSheetSKU {
  id: string;
  name: string;
  msrp: number;
  offerPrice: number;
  imageUrl?: string;
  processedImage?: string;
  rating?: string;             // "4.8 stars on Amazon"
  reviewHighlight?: string;    // Short quote or fact
}
```

**Design decisions:**
- `ListingInfo` fields are free text (not parsed numbers) because the source data uses mixed formats ("3-4 Months", "8 weeks", "$10K", "Take All", "TBD")
- `HotSheetSKU` is a separate type, not extending `SKU`, to keep the two tools decoupled. The fields overlap but the Hot Sheet version adds `rating` and `reviewHighlight`
- `distribution` is a single prose string, not structured, because the library entries vary too much in format
- `aiGenerated` is a single page-level boolean, not per-section tracking. Drives a top-of-page "Verify before sending" banner. Simpler than tracking per-section AI vs. human-edited state
- `formatPrice` and `percentOff` helpers are extracted to `lib/format.ts` (shared by both tools) rather than duplicated

### Implementation Phases

#### Phase 1: Page Shell + Data Model + Static Editor

Create the route, data model, section components, and localStorage persistence. No AI — users fill everything manually. This establishes the editing UX and export pipeline.

**Tasks:**

- [x] Extract `formatPrice` and `percentOff` from `types/sku.ts` into `lib/format.ts` as pure functions. Update `types/sku.ts` to re-export from the shared location (no breaking changes to existing tool)
- [x] Create `types/hot-sheet.ts` with all interfaces and helper functions (`createHotSheet`, `createPressQuote`, `createTiktokEntry`, `createHotSheetSKU`)
- [x] Create `lib/hot-sheet-storage.ts` — save/load under `"hotsheet:session"` key, strip image data on save, validate on load. Follow patterns from `lib/storage.ts`
- [x] Generalize `lib/use-autosave.ts` to accept a generic type + a save function (currently hardcoded to `SKU[]` + `saveSession`). The existing `/` page must continue working after this change
- [x] Create `app/hot-sheet/layout.tsx` with metadata
- [x] Create `app/hot-sheet/page.tsx` — page component with `HotSheet` state, autosave via generalized hook, all section components laid out vertically
- [x] Create `components/hot-sheet/brand-header.tsx` — brand name text input + retailer dropdown (Costco, Sam's Club, BJ's Wholesale, Other with custom input) + "Start New" button (confirm dialog warning about overwriting current Hot Sheet)
- [x] Create `components/hot-sheet/prose-section.tsx` — heading + auto-resizing textarea for prose content ("Why It's Hot", "Distribution Channels")
- [x] Create `components/hot-sheet/listing-info.tsx` — structured form: lead time, min/max order, dotcom availability toggle, link input
- [x] Create `components/hot-sheet/list-section.tsx` — editable list with add/remove per item. Used for Press & Features (text + source + URL fields per item) and Viral TikToks (description + stats fields per item)
- [x] Create `components/hot-sheet/sku-section.tsx` — Top SKUs grid. Each card: name, MSRP, offer price, image upload/paste (replicate drop/paste/URL pattern from `image-dropzone.tsx`), rating field, review highlight field
- [x] Add minimal navigation: text link in existing page header → `/hot-sheet`, and vice versa
- [x] Verify autosave works: edit, refresh, state restores. Verify existing `/` tool still autosaves correctly

**Acceptance criteria:**
- User can navigate to `/hot-sheet` and back to `/`
- All 7 sections render and are editable
- Data persists across page refreshes via localStorage
- Separate from existing tool — editing Hot Sheet does not affect SKU tool state

#### Phase 2: Export Pipeline

Build the copy-to-clipboard export that produces Gmail-ready output. **Two-step export is the default** — copy rich text and copy SKU image are separate buttons. Gmail strips inline base64 images from pasted HTML in most cases, so building the two-step approach first avoids wasted effort.

**Tasks:**

- [x] Create `lib/hot-sheet-export.ts`:
  - `buildHotSheetHTML(hotsheet: HotSheet)` — constructs rich HTML string for sections 1-6 (brand header through TikToks). Uses inline styles matching the template formatting (bold headings, bullet lists, proper spacing). Omits empty sections. Empty check per section: prose sections need non-whitespace text, lists need at least one item, listing info needs at least one filled field
  - `copyTextToClipboard(hotsheet: HotSheet)` — writes `text/html` ClipboardItem for the rich text portions
  - `buildSkuGridPNG(skus: HotSheetSKU[])` — renders Top SKUs as PNG using the append-capture-remove pattern from `lib/export-image.ts`. Returns base64 data URL
  - `copySkuImageToClipboard(skus: HotSheetSKU[])` — writes PNG blob to clipboard (same pattern as existing `copyToClipboard` in `lib/export-image.ts`)
- [x] Create `components/hot-sheet/export-controls.tsx` — two export buttons: "Copy Text" and "Copy SKU Image". Preview modal showing the formatted text + SKU grid. Show count of filled sections ("5/7 sections")
- [x] Handle missing SKU images: render text-only card (name + prices) in the PNG
- [ ] **Spike:** Test whether a single `ClipboardItem` with `text/html` containing an inline `<img>` actually works in Gmail web on Chrome. If it does, add a "Copy All" button as a bonus. If not, the two-step approach is the permanent solution

**Acceptance criteria:**
- "Copy Text" → paste into Gmail compose → formatted text with headings, bullets, proper spacing
- "Copy SKU Image" → paste into Gmail compose → product grid image appears
- Empty sections are omitted from the text export
- Export preview matches what appears in Gmail

#### Phase 3: AI Generation

Add the API route and frontend integration for AI-powered Hot Sheet drafting. **Single request/response** (no NDJSON streaming). Show a full-page loading state while generating. If response time is unacceptable (>15s consistently), streaming can be added later.

**Prerequisite:** Decide on LLM provider before starting this phase. Hardcode the chosen provider — no `LLM_PROVIDER` abstraction. If you switch later, you refactor one file.

**Tasks:**

- [x] Create `app/api/generate-hotsheet/route.ts`:
  - POST endpoint accepting `{ brandName: string, retailer: string }`
  - Origin check + rate limit (3 per minute — LLM calls are expensive)
  - Calls Claude API via raw `fetch` (matching existing API route patterns, no SDK needed)
  - Structured prompt requesting all sections in a defined JSON schema matching the `HotSheet` type
  - Returns `Response.json()` with the complete generated Hot Sheet data
  - Input sanitization: brand name stripped to alphanumeric + common punctuation, max 100 chars
  - Timeout: 45 seconds via `AbortSignal.timeout()` (LLM calls can be slow)
  - Error responses: 501 if API key missing, 429 if rate limited, 504 if timeout, 400 if malformed input
- [x] System prompt design: instruct the LLM to produce factual, non-marketing copy. Include the template structure from the SOP. Request specific fields per section matching the `HotSheet` type. Explicitly instruct: cite sources for press quotes, note that revenue/stats data is estimated
- [x] Frontend: "Generate" button in brand header
  - Loading banner while generating
  - On success: populate all section state, set `aiGenerated: true`
  - Error states: clear messages per error code, editor remains usable (user can fill manually)
  - Cancel button to abort in-flight generation via AbortController
  - **Generate overwrites all sections.** If user has existing edits, show confirm dialog first: "This will replace all current content. Continue?"
- [x] Page-level "AI-generated — verify data before sending" banner. Shows when `aiGenerated` is true. Single dismiss button. Does not reappear until next Generate

**Acceptance criteria:**
- User enters brand + retailer, clicks Generate → all sections populate after loading
- Each section is immediately editable after populating
- Errors show clear messages, don't break the editor
- AI-generated content flagged with a page-level verify banner

#### Phase 4: Polish + Edge Cases

- [ ] Per-section "Regenerate" button — re-generates just that section using current brand name + retailer (add only if users request it after using Phase 3)
- [ ] Undo for "clear" and "regenerate" actions (5-second undo window, matching existing pattern)
- [ ] Autosave status indicator ("Saved" / "Saving..." in header)
- [ ] Keyboard navigation: Tab between sections, Cmd+Enter to trigger export
- [ ] Responsive layout: stack sections vertically on narrower screens (< 768px)
- [ ] Background removal integration for Top SKU images (reuse existing remove-bg API route — note: the `handleImageSelected` logic in `app/page.tsx:51-93` will need to be replicated, not imported, since it's entangled with the page's state)
- [ ] Image suggestions for Top SKU section (reuse existing suggest-images API route)
- [ ] "Copy All" single-clipboard export (only if the Gmail inline image spike from Phase 2 succeeds)

## Alternative Approaches Considered

**Wizard flow (rejected):** A step-by-step flow would guarantee template compliance but feels rigid when users have partial existing research. The canvas editor's flexibility better matches the varying workflows of CS team members.

**Format-only tool (rejected):** Just formatting existing research doesn't reduce the actual content creation time, which is the primary bottleneck.

**Shared state with existing tool (rejected):** Sharing state between `/` and `/hot-sheet` adds coupling complexity for no clear benefit. The tools serve different use cases and should be independently usable.

## Acceptance Criteria

### Functional Requirements

- [ ] New route at `/hot-sheet` accessible from the existing app
- [ ] All 7 Hot Sheet sections editable in a single-page canvas
- [ ] AI generates complete draft from brand name + retailer
- [ ] Export produces Gmail-ready rich text + SKU image (two-step copy)
- [ ] Autosave to localStorage (separate from existing tool)
- [ ] Existing Top SKUs tool at `/` is completely unaffected

### Non-Functional Requirements

- [ ] Hot Sheet creation time under 10 minutes (down from 30-60)
- [ ] Consistent template output regardless of who creates it
- [ ] Works on Chrome desktop (primary), reasonable on Firefox/Safari
- [ ] Export pastes cleanly into Gmail web compose

### Quality Gates

- [ ] All sections render and persist after refresh
- [ ] AI generation handles errors gracefully (no blank screens or broken state)
- [ ] Export omits empty sections cleanly
- [ ] No localStorage collision with existing tool
- [ ] Rate limiting on LLM API route prevents abuse

## Dependencies & Prerequisites

- **LLM API access (Phase 3 only):** Requires an API key for the chosen LLM provider. Env var (e.g., `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) must be set, including in Cloudflare Workers secrets for production
- **No new npm packages needed:** `html-to-image` already installed for export. LLM API called via raw `fetch` (matching existing API route patterns)

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Gmail rejects inline base64 images from clipboard | Single-copy export doesn't work | High | Two-step export (text + image separately) is the default. Single-copy is a Phase 4 enhancement, only if spike succeeds |
| AI generates inaccurate data (fake revenue numbers, fabricated press quotes) | Reputational risk with buyers | High | Page-level "verify before sending" banner. Prompt engineering to cite sources. Users expected to verify |
| localStorage size limit exceeded with many SKU images | Data loss / save failures | Low | Strip image data on save (existing pattern). Only persist metadata |
| LLM API costs escalate with team usage | Budget impact | Medium | Rate limit to 3 req/min. Track usage via logging |
| In-memory rate limiting resets on Cloudflare Workers cold starts | Rate limit is ineffective in production | Medium | Acceptable for a small internal team. If abuse occurs, migrate to Cloudflare KV-based limiter |
| `useAutosave` generalization breaks existing tool | Regression on `/` route | Low | Test existing tool's autosave after the refactor. Generalization is a straightforward change |

## Open Questions

1. **Which LLM provider?** Must be decided before Phase 3 starts. Anthropic (Claude) or OpenAI are the obvious choices. Pick one and hardcode it — no provider abstraction needed for an internal tool
2. **Is the AI data accuracy concern acceptable?** Revenue numbers, TikTok stats, and press quotes from an LLM may be stale or fabricated. The SOP already uses ChatGPT for drafting, so the team may be comfortable with this — but it should be an explicit decision
3. **Should Hot Sheets be shareable?** Currently scoped to localStorage (per-browser). If the team needs to share drafts, a backend would be required — out of scope for now but affects architecture decisions

## References & Research

### Internal References

- Brainstorm: `docs/brainstorms/2026-02-12-hot-sheet-canvas-editor-brainstorm.md`
- SOP document: `docs/Why Its Hot SOP.pdf`
- Brand library: `docs/Why It's Hot Library.pdf`
- State management pattern: `app/page.tsx:16-22`
- localStorage pattern: `lib/storage.ts`
- Autosave hook: `lib/use-autosave.ts`
- API route pattern: `app/api/suggest-images/route.ts`
- Export pattern: `lib/export-image.ts`
- Rate limiting: `lib/rate-limit.ts`
- SKU type: `types/sku.ts`
- Design tokens: `app/globals.css:3-13`

### Institutional Learnings

- React 19 SSR lifecycle: `docs/solutions/runtime-errors/react19-ssr-lifecycle-patterns.md`
- html-to-image gotchas: `docs/solutions/build-errors/html-to-image-hidden-element-export-failure.md`
- API security: `docs/solutions/security-issues/nextjs-16-api-security-hardening.md`
- Cloudflare deployment: `docs/solutions/deployment-errors/cloudflare-auth-token-precedence-20260211.md`

### Template Structure (from library analysis)

30+ brand entries across Costco and Sam's Club follow the same structure: brand story, distribution channels, similar brands, listing info, press features, viral TikToks, top SKUs with pricing and ratings. This structure is codified in the `HotSheet` type definition above.
