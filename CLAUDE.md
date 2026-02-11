# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

"Why It's Hot" (Top SKUs Visual Generator) — a single-page Next.js app that lets buyers create product card visuals for emails. Users add SKUs (product name, MSRP, offer price, image), preview cards in a grid, and export as PNG or copy to clipboard.

## Commands

```bash
npm run dev          # Start dev server (Next.js with Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Build + preview via Cloudflare Workers
npm run deploy       # Build + deploy to Cloudflare Workers
```

## Architecture

Single-page client app (`app/page.tsx`) with three API routes. All state lives in the page component as `SKU[]` and autosaves to localStorage (stripped of image data).

### Data Flow

1. **Input**: `DataInput` component — manual form with product name, MSRP, offer price, image (drop/paste/URL/suggestions via side panel)
2. **Processing**: On image add, optionally runs server-side background removal via remove.bg API (`/api/remove-bg`). Requires `REMOVEBG_API_KEY` env var.
3. **Preview**: `CardGrid` renders draggable `ProductCard` components (React.memo) with inline editing
4. **Export**: `export-image.ts` builds a standalone HTML DOM element, renders it with `html-to-image`, then downloads PNG or copies to clipboard

### API Routes

- `app/api/suggest-images/route.ts` — Streams image suggestions via SerpAPI Google Images. NDJSON stream with bounded concurrency (3 workers). Requires `SERPAPI_KEY`.
- `app/api/proxy-image/route.ts` — SSRF-protected image proxy for fetching full-res images from external URLs.
- `app/api/remove-bg/route.ts` — Server-side background removal via remove.bg API. Requires `REMOVEBG_API_KEY`.

### Key Types

`types/sku.ts` defines the `SKU` interface (id, name, msrp, offerPrice, imageUrl, processedImage, isProcessingImage) and helpers (`createSKU`, `percentOff`, `formatPrice`).

### Deployment

Cloudflare Workers via `@opennextjs/cloudflare`. Config in `wrangler.jsonc` and `open-next.config.ts`.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- TypeScript (strict mode)
- Fonts: Inter (body) + Sora (headings) via `next/font`
- Path alias: `@/*` maps to project root
