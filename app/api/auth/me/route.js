import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/auth/jwt";

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { username: session.username, role: session.role } });
}
