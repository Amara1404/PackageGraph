import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getMetadataCollection } from "@/lib/db/mongo";

export async function GET(request, { params }) {
  const { id } = await params;
  const { rows } = await query("SELECT name FROM package WHERE package_id = $1", [id]);
  if (!rows[0]) {
    return NextResponse.json({ error: "package not found" }, { status: 404 });
  }
  const metaCol = await getMetadataCollection();
  const doc = await metaCol.findOne({ name: rows[0].name }, { projection: { _id: 0 } });
  return NextResponse.json({ metadata: doc || null });
}
