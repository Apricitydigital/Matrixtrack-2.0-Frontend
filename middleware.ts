import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/unified-login",
  "/create-account",
  "/_next",
  "/api",
  "/static",
  "/favicon.ico",
];
const PROTECTED_PREFIXES = [
  "/hms",
  "/city",
  "/municipal",
  "/modules",
  "/dashboard",
  "/ward-ranking",
];
const UNIFIED_PREFIXES = ["/portal-home"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const requiresUnifiedSession =
    UNIFIED_PREFIXES.some((path) =>
      pathname.startsWith(path),
    );

  if (requiresUnifiedSession) {
    const unifiedSession =
      req.cookies.get("unified_session")?.value;

    const taskforceToken =
      req.cookies.get("hms_access_token")?.value;

    if (!unifiedSession && !taskforceToken) {
      const loginUrl = new URL(
        "/unified-login",
        req.url,
      );

      loginUrl.searchParams.set("next", pathname);

      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!requiresAuth) return NextResponse.next();

  const token = req.cookies.get("hms_access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/unified-login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Future: validate roles/city/module claims server-side here and route accordingly.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};