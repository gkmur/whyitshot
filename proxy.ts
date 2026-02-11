import { NextResponse, type NextRequest } from "next/server";

export default function proxy(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next();

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  // Allow same-origin requests
  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    // No Origin header — check Referer as fallback
    const referer = req.headers.get("referer");
    if (referer) {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    // If neither Origin nor Referer, allow (server-side calls, curl, etc.)
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
