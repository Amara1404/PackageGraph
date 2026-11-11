import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

async function assertOwner(appId, session) {
  const { rows } = await query("SELECT owner_id FROM application WHERE app_id = $1", [appId]);
  if (!rows[0]) return "not_found";
  if (session.role !== "security_admin" && rows[0].owner_id !== session.sub) return "forbidden";
  return "ok";
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { rows } = await query(
    `SELECT p.package_id, p.name, p.version
     FROM application_dependency ad
     JOIN package p ON p.package_id = ad.package_id
     WHERE ad.app_id = $1
     ORDER BY p.name`,
    [id]
  );
  return NextResponse.json({ packages: rows });
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "login required" }, { status: 401 });

  const { id } = await params;
  const check = await assertOwner(id, session);
  if (check === "not_found") return NextResponse.json({ error: "application not found" }, { status: 404 });
  if (check === "forbidden") return NextResponse.json({ error: "not your application" }, { status: 403 });

  const { package_id } = await request.json();
  if (!package_id) return NextResponse.json({ error: "package_id required" }, { status: 400 });

  await query(
    `INSERT INTO application_dependency (app_id, package_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [id, package_id]
  );
  return NextResponse.json({ ok: true });
}
