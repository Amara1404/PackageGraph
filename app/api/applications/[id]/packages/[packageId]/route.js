import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "login required" }, { status: 401 });

  const { id, packageId } = await params;
  const { rows } = await query("SELECT owner_id FROM application WHERE app_id = $1", [id]);
  if (!rows[0]) return NextResponse.json({ error: "application not found" }, { status: 404 });
  if (session.role !== "security_admin" && rows[0].owner_id !== session.sub) {
    return NextResponse.json({ error: "not your application" }, { status: 403 });
  }

  await query("DELETE FROM application_dependency WHERE app_id = $1 AND package_id = $2", [id, packageId]);
  return NextResponse.json({ ok: true });
}
