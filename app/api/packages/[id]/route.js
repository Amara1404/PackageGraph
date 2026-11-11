import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getMetadataCollection } from "@/lib/db/mongo";
import { deleteMetadata } from "@/lib/crawler";
import { getSession } from "@/lib/auth/session";

// Deletes a package (Postgres row + cascading dependency/flag rows), then
// purges its cached Mongo metadata doc once no other version of the same
// package name remains.
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== "security_admin") {
    return NextResponse.json({ error: "security_admin role required" }, { status: 403 });
  }

  const { id } = await params;
  const { rows } = await query("DELETE FROM package WHERE package_id = $1 RETURNING name", [id]);
  if (!rows[0]) {
    return NextResponse.json({ error: "package not found" }, { status: 404 });
  }

  const { rows: remaining } = await query("SELECT 1 FROM package WHERE name = $1 LIMIT 1", [rows[0].name]);
  if (!remaining[0]) {
    const metaCol = await getMetadataCollection();
    await deleteMetadata(metaCol, rows[0].name);
  }

  return NextResponse.json({ ok: true });
}
