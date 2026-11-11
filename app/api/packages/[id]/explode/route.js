import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";

export async function GET(request, { params }) {
  const { id } = await params;
  const { rows } = await query("SELECT * FROM explode_dependencies($1)", [id]);
  return NextResponse.json({ package_id: Number(id), dependencies: rows });
}
