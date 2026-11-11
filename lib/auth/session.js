import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/auth/jwt";

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}
