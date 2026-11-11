import { NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth/jwt";

export function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  const { pathname } = request.nextUrl;

  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/dashboard/vulnerabilities") && session.role !== "security_admin") {
    return NextResponse.redirect(new URL("/dashboard/packages", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
  runtime: "nodejs",
};
