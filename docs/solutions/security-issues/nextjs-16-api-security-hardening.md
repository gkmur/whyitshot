---
title: "API Security Hardening for Next.js 16: Origin Checking + Rate Limiting + SSRF Protection"
date: "2026-02-11"
problem_type: security_issue
component: API Routes (suggest-images, proxy-image, remove-bg)
symptoms:
  - "API endpoints accept POST requests from any origin"
  - "No rate limiting allows request flooding and quota exhaustion"
  - "Image proxy without SSRF protection enables server-side request forgery"
root_cause: "Default Next.js API routes have no built-in origin validation or rate limiting"
severity: high
tags:
  - next.js-16
  - api-security
  - ssrf-protection
  - rate-limiting
  - origin-checking
  - cloudflare-workers
---

# API Security Hardening for Next.js 16

## Problem Statement

Three API routes (`/api/suggest-images`, `/api/remove-bg`, `/api/proxy-image`) accepted POST requests from any origin with no rate limiting. This made them vulnerable to:
- Cross-site abuse (any website could call the endpoints)
- Request flooding / quota exhaustion (SerpAPI and remove.bg have usage limits)
- SSRF attacks through the image proxy

## Solution: Three-Layer Defense

### Layer 1: Origin Checking Proxy (`proxy.ts`)

Next.js 16 **deprecated `middleware.ts`** in favor of `proxy.ts`. The proxy checks the `Origin` header against `Host` on all POST requests to `/api/*`.

```typescript
// proxy.ts — NOT middleware.ts (Next.js 16 convention)
import { NextResponse, type NextRequest } from "next/server";

export default function proxy(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next();
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const referer = req.headers.get("referer");
    if (referer && new URL(referer).host !== host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
```

### Layer 2: Per-Route Rate Limiting (`lib/rate-limit.ts`)

In-memory sliding window rate limiter with per-IP tracking. Different limits per route based on resource cost:

| Route | Limit | Reason |
|-------|-------|--------|
| suggest-images | 10/min | SerpAPI quota protection |
| remove-bg | 5/min | remove.bg API costs per call |
| proxy-image | 30/min | Bandwidth protection |

Usage: `const limited = rateLimit("route-name", req, 10); if (limited) return limited;`

### Layer 3: SSRF-Protected Image Proxy

The `/api/proxy-image` route validates all URLs before fetching:
- HTTPS only
- No IP addresses (blocks 192.168.x.x, 10.x.x.x, 169.254.x.x, etc.)
- No localhost / internal hostnames (.local, .internal)
- No redirects (`redirect: "error"`)
- Content-type validation (image types only)
- Size limit (2MB)

## Key Gotcha: Next.js 16 proxy.ts Convention

Using `middleware.ts` with `export function middleware()` triggers a deprecation warning and may silently fail to intercept routes. The correct pattern in Next.js 16:

- File must be named `proxy.ts` (not `middleware.ts`)
- Export must be `export default function proxy()` (not `export function middleware()`)
- `config.matcher` works the same way

The build warning says: "The middleware file convention is deprecated. Please use proxy instead."

## Prevention Checklist for New API Routes

- [ ] Add `rateLimit()` call as first line of handler
- [ ] Set appropriate limit based on resource cost
- [ ] Validate input types and sizes before processing
- [ ] Set `AbortSignal.timeout()` on all upstream fetches
- [ ] For proxy/fetch routes: validate URLs with SSRF protection
- [ ] Never expose API keys in error responses
- [ ] Return generic error messages (don't leak internals)

## Production Considerations

**In-memory rate limiting limitations on Cloudflare Workers:**
- State clears on worker restart/redeploy
- Each edge location has its own rate limit map (no global view)
- Adequate for low-to-medium traffic; upgrade to Cloudflare's built-in rate limiting for high traffic

**Hybrid approach:** Keep in-memory for fast local filtering + Cloudflare edge rules as backup for distributed attacks.

## Related Documentation

- `docs/plans/2026-02-11-feat-sku-input-image-ux-improvements-plan.md` — SSRF protection design
- `docs/solutions/runtime-errors/react19-ssr-lifecycle-patterns.md` — AbortController patterns

## Files

- `proxy.ts` — Origin checking proxy
- `lib/rate-limit.ts` — Sliding window rate limiter
- `app/api/proxy-image/route.ts` — SSRF-protected image proxy
- `app/api/suggest-images/route.ts` — Image search (10 req/min)
- `app/api/remove-bg/route.ts` — Background removal (5 req/min)
