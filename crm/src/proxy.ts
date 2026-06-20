// Optimistic auth guard (Next.js 16 renamed `middleware` → `proxy`, nodejs
// runtime). This only does a fast cookie-presence check for snappy redirects;
// real verification happens in the Data Access Layer (requireUser) on every
// protected page, action and route handler.
import { NextResponse, type NextRequest } from "next/server";

// Inlined (not imported from lib/session) so this lightweight guard doesn't
// pull Prisma into the proxy bundle.
const SESSION_COOKIE = "crm_session";
const PUBLIC_PATHS = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes (they self-protect) and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
