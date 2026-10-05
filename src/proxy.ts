import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional protection for an externally hosted deployment.
 *  - Browser: HTTP Basic auth when RADAR_ADMIN_PASSWORD is set (any username).
 *  - Machines (your build system): `Authorization: Bearer <RADAR_API_KEY>` on /api/*.
 */
export function proxy(req: NextRequest) {
  const password = process.env.RADAR_ADMIN_PASSWORD;
  const apiKey = process.env.RADAR_API_KEY;
  if (!password && !apiKey) return NextResponse.next();

  const isApi = req.nextUrl.pathname.startsWith("/api/");
  if (!password && !isApi) return NextResponse.next();
  const auth = req.headers.get("authorization") ?? "";

  if (apiKey && isApi && auth === `Bearer ${apiKey}`) {
    return NextResponse.next();
  }

  if (password && auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
  }

  if (!password) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Opportunity Radar"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
