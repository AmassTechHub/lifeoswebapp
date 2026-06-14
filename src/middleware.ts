import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/focus",
  "/goals",
  "/planner",
  "/calendar",
  "/tasks",
  "/habits",
  "/learning",
  "/content",
  "/clients",
  "/finance",
  "/coach",
  "/settings",
];

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (sessionCookie && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!sessionCookie && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/focus/:path*",
    "/goals/:path*",
    "/planner/:path*",
    "/calendar/:path*",
    "/tasks/:path*",
    "/habits/:path*",
    "/learning/:path*",
    "/content/:path*",
    "/clients/:path*",
    "/finance/:path*",
    "/coach/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
