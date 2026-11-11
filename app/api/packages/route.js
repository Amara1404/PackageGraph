import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";

export async function GET(request) {
  const search = request.nextUrl.searchParams.get("q") || "";
  const { rows } = await query(
    `SELECT p.package_id, p.name, p.version, p.description,
            (SELECT COUNT(*)::int FROM dependency d WHERE d.child_package_id = p.package_id) AS dependent_count
     FROM package p
     WHERE p.name ILIKE $1
     ORDER BY p.name
     LIMIT 50`,
    [`%${search}%`]
  );
  return NextResponse.json({ packages: rows });
}
