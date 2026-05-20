import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  AUTH_ROLE_COOKIE_NAME,
} from "@/lib/auth";
import type { UserRole } from "@/types/crm";

const protectedRoutes = [
  "/dashboard",
  "/leads",
  "/customers",
  "/pipeline",
  "/tasks",
  "/messages",
  "/reports",
  "/team",
  "/notifications",
  "/settings",
];

const routeAccess: Record<string, UserRole[]> = {
  "/team": ["super_admin", "admin"],
  "/reports": ["super_admin", "admin", "sales_manager", "marketer", "viewer"],
  "/notifications": [
    "super_admin",
    "admin",
    "sales_manager",
    "marketer",
    "sales_representative",
    "support_agent",
    "viewer",
  ],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!requiresAuth) return NextResponse.next();

  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (pathname === "/settings/billing" || pathname.startsWith("/settings/billing/")) {
    if (session !== AUTH_COOKIE_VALUE) {
      const loginUrl = new URL("/auth", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (session !== AUTH_COOKIE_VALUE) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const currentRole = request.cookies.get(AUTH_ROLE_COOKIE_NAME)?.value as UserRole | undefined;
  const restrictedRoute = Object.keys(routeAccess).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (restrictedRoute) {
    const allowedRoles = routeAccess[restrictedRoute];
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/customers/:path*",
    "/pipeline/:path*",
    "/tasks/:path*",
    "/messages/:path*",
    "/reports/:path*",
    "/team/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
