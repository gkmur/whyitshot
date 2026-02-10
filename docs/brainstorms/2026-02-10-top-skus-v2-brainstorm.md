# Top SKUs Visual Generator v2 — Brainstorm

## What We're Building

A set of improvements to the Top SKUs Visual Generator that bring the app in line with ghst.io's design system, add persistence and onboarding, and ship quality-of-life features the team needs.

### 1. Design Refresh — ghst.io Alignment

**Current state:** Orange accent (#f97316), gray/white palette, utilitarian feel.

**Target:** Light mode with ghst.io's purple accent (#564ef5), TWK Lausanne for headings, Inter for body text. Spacious, premium feel matching the admin/site aesthetic.

Changes:
- Swap orange accent → purple (#564ef5) across all interactive elements
- Update hover states, focus rings, borders to use purple palette
- Add TWK Lausanne font for headings (h1, h2, section headers)
- Keep Inter for body/UI text (already in use)
- Increase padding and gaps (40-60px sections, 32px component gaps) to match ghst.io's spacious layout
- Update the export output to use the same purple-accented design
- Border radius, shadows, and spacing aligned with ghst.io patterns (20px radius, generous gaps)

### 2. Uniform Image Dimensions in Export

**Problem:** Product images vary in size/aspect ratio, making exports look inconsistent.

**Solution:** Force all product images to render at identical dimensions in the export. Use `object-fit: contain` within a fixed-size box so images fill the space without distortion. This applies to the PNG export output specifically — the preview cards can remain flexible.

### 3. Interactive Onboarding

**Target users:** Brand partners, interns, new CS team members who haven't used the tool.

Two layers:
- **First-visit tooltip walkthrough:** Step-by-step tooltips highlighting each section (paste data → upload images → edit cards → export). Shown once, dismissible, stored in localStorage as "seen".
- **Persistent empty state hints:** Contextual helper text when sections are empty. Example: data input shows "Paste SKU data from your spreadsheet (Name, MSRP, Your Price, Units)" with a sample format. These stay permanently as guidance.

No external library needed — simple tooltip component with pointer positioning.

### 4. Auto-Save (localStorage)

**Scope:** Current session survives page refresh. No accounts, no backend.

What gets saved:
- Current SKU list (name, pricing, units)
- Compressed image thumbnails (not full data URLs — localStorage cap is ~5MB)
- Auto-save on every change (debounced)
- Load last session on app start

**Image storage strategy:** Store compressed/resized thumbnails for preview. Full-resolution images are transient — users re-upload or re-fetch if they return to an old session. This keeps storage well under the 5MB limit.

### Stretch: Named History Gallery

_Not in initial scope. Build after auto-save is working._

- Save named creations (e.g., "Q1 Nike Offer") as snapshots
- Simple list UI to recall past work
- Each snapshot = SKU data + thumbnail references

### 5. Quality of Life Features

**Undo/redo:** State history stack with Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts.

**Drag to reorder cards:** Drag handle on each card to rearrange SKU order. Order carries through to export.

**Image URL paste:** Text input alongside drag-drop in the image dropzone. Fetch image, convert to data URL, process as normal. If CORS blocks the fetch, show error and suggest downloading the image first.

## Why This Approach

**Design-first ordering.** The visual refresh touches every component file. Doing it first means every subsequent feature (onboarding tooltips, history UI, drag handles) ships in the new aesthetic without rework.

Sequence:
1. Design tokens + global styles (purple palette, typography, spacing)
2. Component-by-component visual update
3. Export output styling update + uniform image dimensions
4. Auto-save (localStorage)
5. Onboarding (tooltips + empty states)
6. QoL (undo/redo, drag reorder, image URL paste)
7. Stretch: named history gallery

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Theme mode | Light with purple accents | Matches ghst.io content sections, keeps export readable |
| Image consistency | Uniform image dimensions | Product images should look professional and aligned in exports |
| Onboarding | Tooltip walkthrough + empty state hints | Covers first-time and ongoing guidance |
| Persistence | Auto-save to localStorage, history gallery is stretch | Auto-save is essential; gallery adds complexity without blocking the core flow |
| Image storage | Compressed thumbnails, not full data URLs | Keeps localStorage under 5MB cap |
| QoL scope | Undo/redo, drag reorder, URL paste | Highest-impact items without scope creep |
| Approach | Design-first | Avoids touching every component twice |

## Open Questions

- **TWK Lausanne licensing:** Is this font self-hosted on ghst.io or available via a CDN? Need to confirm we can use it in this app. Fallback: use a similar geometric sans from Google Fonts.
- **Export branding:** Should the PNG export include a ghst.io logo or watermark?

## Out of Scope (Future)

- Cloud persistence / user accounts
- Brand narrative generator (Perplexity + Claude)
- SmartScout / Keepa data integration
- Google Sheet import
- Batch generation
