# Why It's Hot — Automation Tool Brainstorm

**Date:** 2026-02-10
**Status:** Draft
**Participants:** Gabe, Chirawan (Brand Partner)

---

## What We're Building

A web app that automates the creation of "Why It's Hot" sheets — sell-in documents used to introduce brands to enterprise buyers (Sam's Club, Costco).

**MVP focus: Top SKUs Visual Generator.** This is the #1 pain point confirmed by Chirawan. Everything else is future work.

---

## The Problem

The team builds product card visuals in Google Slides: manually searching for product images, removing backgrounds, adding pricing data, formatting layouts, and screenshotting the result. This happens for every offer. It's the slowest, most tedious part of the Hot Sheet workflow.

The tool sits at the END of the merchandising pipeline:
```
Seller sends offer spreadsheet
    → Brand Partner merchandises (selects SKUs using SmartScout data)
    → Formatted into buyer-specific offer
    → QA'd and finalized
    → Hot Sheet creation begins ← TOOL LIVES HERE
```

By this point, the SKU data (product names, MSRP, offer price, quantities) already exists.

---

## MVP (v1): Top SKUs Visual Generator

### What It Does
- User inputs SKU data: product name, MSRP, your price, quantity/units
- User uploads product images (drag-and-drop or paste URL)
- App removes image backgrounds automatically
- Live preview renders a styled product card grid
- Export as PNG ready to paste into email body

### Input
- **Paste from spreadsheet** (tab-separated) — the common case
- **Manual form entry** — for quick edits or one-offs

### Image Handling
- **User uploads images or pastes URLs** — the reliable path
- **Auto background removal** via remove.bg API (or client-side rembg)
- Images rendered on white background, consistent sizing across cards

### Output
- **PNG export** of the product card grid — pasted directly into email body
- Must look clean in email clients (Outlook, Gmail)
- Layout matches the existing format: product image on top, name below, MSRP / Your Price / % Off

### Why Not Auto-Search Images?
Automated product image search (Google Images API, scraping brand sites) is unreliable — wrong products, wrong angles, inconsistent quality. Since the team already finds images during merchandising, letting them upload/paste URLs is faster and more accurate than building flaky automation.

---

## Key Decisions

### 1. Upload-first for images, not search-first
Auto-image-search is a rabbit hole. The team knows which products they're featuring and can grab images quickly. The tool's job is formatting, not sourcing.

### 2. Paste-from-spreadsheet as primary input
The data already lives in spreadsheets. Copy a few columns, paste into the app. No API integration needed for v1.

### 3. PNG export (not HTML email)
Email clients mangle HTML. A PNG image of the product cards is what the team already uses (via screenshots) and renders consistently everywhere.

### 4. Data Sources for v1
| Source | Role in v1 |
|--------|-----------|
| **User input** | SKU data (name, MSRP, price, units) — pasted or typed |
| **User upload** | Product images — drag-drop or URL |
| **remove.bg API** | Background removal |

No external data APIs in v1. SmartScout/Keepa data is used upstream during merchandising — by the time the Hot Sheet is created, that data has already been applied.

---

## Open Questions

1. **SmartScout/Keepa API access** — Does the team have API keys? Relevant for future versions where we auto-pull Amazon sales data into the visual.

2. **Authentication** — Does the app need login, or is it internal-only accessible by URL?

3. **Hosting** — Where does this run? Vercel? Internal server?

4. **Card layout variations** — Is the 3-column grid always the format, or do some offers need 2 or 4 columns?

---

## Future (post-MVP)

These are real features, just not v1:

- **Brand Narrative Generator** — Perplexity API for research + Claude API for synthesis. Generates the "Why It's Hot", Distribution Channels, Press & Features sections with factual tone.
- **SmartScout/Keepa integration** — Auto-pull Amazon sales velocity and pricing history into the visual or narrative.
- **Google Sheet import** — Pull SKU data directly from the tracker spreadsheet via URL.
- **Buyer-specific templates** — Customize the narrative to reference brands the specific buyer already carries.
- **Batch generation** — Multiple Hot Sheets from a list of brands.
- **Copy-to-clipboard for narrative** — Formatted text sections ready to paste into email alongside the PNG.

---

## Technical Direction

**Stack:**
- Next.js (TypeScript) — app framework
- Tailwind CSS — styling
- html-to-image — PNG export of the styled HTML card grid
- remove.bg API — background removal (or client-side alternative)

**That's it for v1.** No AI APIs, no external data APIs. The value is in the visual formatting tool itself.
