# Why It's Hot

[![CI](https://github.com/gkmur/whyitshot/actions/workflows/ci.yml/badge.svg)](https://github.com/gkmur/whyitshot/actions/workflows/ci.yml)

Top-SKU workflow app for collecting products, polishing images, and exporting ready-to-share visual summaries.

## Local Development

```bash
npm install
npm run dev
```

## Environment Variables

Create `/Users/gabrielmurray/dev/whyitshot/.env.local` with the keys you plan to use:

```bash
SERPAPI_KEY=your_serpapi_key
REMOVEBG_API_KEY=your_removebg_key
```

- `SERPAPI_KEY`: enables image suggestions.
- `REMOVEBG_API_KEY`: enables background removal.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

## Troubleshooting

- `Image search not configured`:
  - Add `SERPAPI_KEY` to `/Users/gabrielmurray/dev/whyitshot/.env.local`.
  - Restart `npm run dev`.
- `Background removal not configured`:
  - Add `REMOVEBG_API_KEY` to `/Users/gabrielmurray/dev/whyitshot/.env.local`, or disable auto-remove backgrounds in the UI.
- API timeout errors (`Search timed out`, `Fetch timed out`, `Background removal timed out`):
  - Retry the action; upstream providers or remote image hosts may be slow/unavailable.
- Cloudflare deploy auth error `code: 10000`:
  - See `/Users/gabrielmurray/dev/whyitshot/docs/solutions/deployment-errors/cloudflare-auth-token-precedence-20260211.md`.
