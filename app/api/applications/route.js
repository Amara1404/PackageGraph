import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "login required" }, { status: 401 });

  const isAdmin = session.role === "security_admin";
  const { rows } = await query(
    `SELECT a.app_id, a.name, a.owner_id, u.username AS owner_username
     FROM application a
     JOIN app_user u ON u.user_id = a.owner_id
     WHERE $1 OR a.owner_id = $2
     ORDER BY a.name`,
    [isAdmin, session.sub]
  );
  return NextResponse.json({ applications: rows });
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "login required" }, { status: 401 });

  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { rows } = await query(
    "INSERT INTO application (name, owner_id) VALUES ($1, $2) RETURNING app_id, name, owner_id",
    [name, session.sub]
  );
  return NextResponse.json({ application: rows[0] });
}
