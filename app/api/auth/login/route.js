import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db/postgres";
import { signSession, COOKIE_NAME } from "@/lib/auth/jwt";

export async function POST(request) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }

  const { rows } = await query(
    "SELECT user_id, username, password_hash, role FROM app_user WHERE username = $1",
    [username]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const token = signSession({ sub: user.user_id, username: user.username, role: user.role });

  const res = NextResponse.json({ username: user.username, role: user.role });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
