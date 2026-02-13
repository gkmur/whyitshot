# Hot Sheet Canvas Editor

**Date:** 2026-02-12
**Status:** Brainstorm complete
**Author:** Gabe + Claude

## What We're Building

A full Hot Sheet authoring tool as a separate page/mode within the existing "Why It's Hot" app. The canvas editor lets CS team members and interns assemble complete, email-ready Hot Sheets for specific brand + retailer combinations — faster and more consistently than the current multi-tool workflow (ChatGPT + Google Docs + Google Slides + Gmail).

The existing Top SKUs visual generator stays untouched as its own tool.

### The Problem

Assembling a full Hot Sheet currently requires:
1. ChatGPT to draft brand copy
2. Manual research for press, TikToks, distribution channels
3. Google Slides template for Top SKUs visual (screenshot + paste)
4. Google Docs to compile everything
5. Copy-paste into Gmail

This is slow (~30-60 min per Hot Sheet), error-prone (inconsistent formatting, missed sections), and fragmented across 5+ tools.

### The Solution

A single-page canvas editor with all Hot Sheet sections visible at once:
- **Brand + Retailer header** (e.g. "Lola Blankets — Costco")
- **Why It's Hot** — brand story / sell-in copy
- **Distribution Channels & Similar Brands**
- **Listing Information** — lead time, MOV, max order, link
- **Press & Features** — press quotes with source attribution
- **Viral TikToks** — video descriptions with view/like counts
- **Top SKUs** — product cards with images, MSRP, offer price, % off

AI can auto-generate a draft for any/all sections from just a brand name. Users edit inline, override, add/remove content freely. Export produces formatted text + images that paste cleanly into Gmail.

## Why This Approach

**Canvas editor over wizard:** The CS team has varying levels of existing research per brand. Sometimes they have a full ChatGPT draft to paste in; sometimes they're starting from scratch. A flexible canvas lets them work in any order and use AI selectively rather than being forced through a linear flow.

**Separate from Top SKUs tool:** The existing SKU visual generator works and serves a different (narrower) use case. Coupling them risks breaking what works. The canvas editor can eventually embed the SKU visual as a section, but they should be independently usable.

**Output as copyable text + images (not just PNG):** Hot Sheets get pasted into Gmail as formatted text with inline images. A pure image export would break the workflow. The output needs to be rich text that preserves formatting when pasted.

## Key Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Scope | Separate page within same app | Don't disturb existing Top SKUs tool |
| AI role | Generate draft + user edits | "Both" — AI drafts, humans refine |
| Output format | Copyable rich text + images | Matches the Gmail paste workflow |
| Retailer handling | Each Hot Sheet is retailer-specific | Per the team's existing process |
| Primary users | CS team and interns | The people who actually assemble Hot Sheets |
| Success metric | Speed (under 10 min) + consistency (template-perfect every time) | Currently takes 30-60 min with quality variance |

## Template Structure (from SOP + Library)

Every Hot Sheet follows this exact structure:

```
[Brand Name] - [Retailer]

Why It's Hot
[2-4 sentence brand story — factual, not sales-y]

Distribution Channels & Similar Brands
[Where it's sold + 3-4 comparable brands + Amazon revenue if applicable]

Listing Information
- Lead Time: [X weeks/months]
- Minimum Order Value: [$X]
- Maximum Order Value: [$X]
- Link to [ACS/Listing]

Press & Features
- [Quote or headline] ([Source])
- [Quote or headline] ([Source])
- [Quote or headline] ([Source])

Viral TikToks
- [Description] ([XK likes & XM views])
- [Description] ([XK likes & XM views])

Top SKUs
[Product cards with image, name, MSRP, offer price, % off, rating/review data]
```

## Open Questions

- **AI provider:** Use an existing API route or add a new one for brand research generation? What model/service?
- **Image handling for Top SKUs within canvas:** Reuse existing image search/upload from the SKU tool, or build a lighter version?
- **Persistence:** localStorage like the SKU tool, or does this need server-side storage for team sharing?
- **Copy-to-email fidelity:** How to ensure rich text + images paste cleanly into Gmail? Need to test clipboard API with HTML formatting.
- **Navigation:** Separate route (`/hot-sheet`) or tab/mode toggle on the same page?

## Out of Scope (for now)

- Replacing Google Docs library (the app produces content, doesn't store the archive)
- Tracker integration (linking Hot Sheets back to spreadsheets)
- Multi-user collaboration / real-time editing
- Modifying the existing Top SKUs visual generator
