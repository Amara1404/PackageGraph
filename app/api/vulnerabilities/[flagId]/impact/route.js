import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";

export async function GET(request, { params }) {
  const { flagId } = await params;

  const { rows: flagRows } = await query(
    "SELECT package_id FROM vulnerability_flag WHERE flag_id = $1",
    [flagId]
  );
  if (!flagRows[0]) {
    return NextResponse.json({ error: "flag not found" }, { status: 404 });
  }
  const packageId = flagRows[0].package_id;

  const { rows: packages } = await query(
    "SELECT package_id, name, version, depth FROM implode_impact($1)",
    [packageId]
  );

  const { rows: apps } = await query(
    `WITH affected_packages AS (
       SELECT package_id FROM implode_impact($1)
       UNION
       SELECT $1::int
     )
     SELECT DISTINCT a.app_id, a.name, u.username AS owner_username
     FROM application_dependency ad
     JOIN affected_packages ap ON ap.package_id = ad.package_id
     JOIN application a ON a.app_id = ad.app_id
     JOIN app_user u ON u.user_id = a.owner_id
     ORDER BY a.name`,
    [packageId]
  );

  return NextResponse.json({ packages, applications: apps });
}
