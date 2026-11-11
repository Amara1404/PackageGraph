import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
export const COOKIE_NAME = "pg_session";

export function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "8h" });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
