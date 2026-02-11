const windows = new Map<string, Map<string, number[]>>();

export function rateLimit(
  route: string,
  req: Request,
  limit: number,
  windowMs: number = 60_000
): Response | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  const key = `${route}:${ip}`;
  if (!windows.has(route)) windows.set(route, new Map());
  const routeMap = windows.get(route)!;

  const now = Date.now();
  const timestamps = routeMap.get(key) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
    );
  }

  recent.push(now);
  routeMap.set(key, recent);

  // Periodic cleanup: if map grows large, prune stale entries
  if (routeMap.size > 1000) {
    for (const [k, ts] of routeMap) {
      const filtered = ts.filter((t) => now - t < windowMs);
      if (filtered.length === 0) routeMap.delete(k);
      else routeMap.set(k, filtered);
    }
  }

  return null;
}
