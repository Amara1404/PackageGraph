import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";
import { fetchOsvVuln } from "@/lib/osv";

export async function GET() {
  const { rows } = await query(`
    SELECT
      f.flag_id, f.status, f.flagged_at,
      p.package_id, p.name AS package_name, p.version AS package_version,
      v.vuln_id, v.osv_id, v.severity, v.summary,
      r.report_id, r.affected_package_count, r.affected_app_count, r.generated_at,
      u.username AS flagged_by
    FROM vulnerability_flag f
    JOIN package p ON p.package_id = f.package_id
    JOIN vulnerability v ON v.vuln_id = f.vuln_id
    JOIN app_user u ON u.user_id = f.flagged_by
    LEFT JOIN impact_report r ON r.flag_id = f.flag_id
    ORDER BY f.flagged_at DESC
  `);
  return NextResponse.json({ flags: rows });
}

export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== "security_admin") {
    return NextResponse.json({ error: "security_admin role required" }, { status: 403 });
  }

  const { package_id, osv_id } = await request.json();
  if (!package_id || !osv_id) {
    return NextResponse.json({ error: "package_id and osv_id required" }, { status: 400 });
  }

  const live = await fetchOsvVuln(osv_id);

  let report;
  try {
    report = await withTransaction(async (client) => {
    let vulnId;

    if (live) {
      const { rows } = await client.query(
        `INSERT INTO vulnerability (osv_id, severity, summary)
         VALUES ($1, $2, $3)
         ON CONFLICT (osv_id) DO UPDATE SET severity = EXCLUDED.severity, summary = EXCLUDED.summary
         RETURNING vuln_id`,
        [live.osvId, live.severity, live.summary]
      );
      vulnId = rows[0].vuln_id;

      await client.query("DELETE FROM affected_range WHERE vuln_id = $1", [vulnId]);
      for (const range of live.affectedRanges) {
        await client.query(
          `INSERT INTO affected_range (vuln_id, package_name, introduced, fixed)
           VALUES ($1, $2, $3, $4)`,
          [vulnId, range.packageName, range.introduced, range.fixed]
        );
      }
    } else {
      const { rows } = await client.query("SELECT vuln_id FROM vulnerability WHERE osv_id = $1", [osv_id]);
      if (!rows[0]) {
        throw new Error(`OSV.dev unreachable and no cached record for ${osv_id}`);
      }
      vulnId = rows[0].vuln_id;
    }

    const { rows: flagRows } = await client.query(
      `INSERT INTO vulnerability_flag (package_id, vuln_id, status, flagged_by)
       VALUES ($1, $2, 'open', $3)
       ON CONFLICT (package_id, vuln_id) DO UPDATE SET status = 'open', flagged_at = now()
       RETURNING flag_id`,
      [package_id, vulnId, session.sub]
    );
    const flagId = flagRows[0].flag_id;

    const { rows: reportRows } = await client.query(
      `INSERT INTO impact_report (flag_id)
       VALUES ($1)
       ON CONFLICT (flag_id) DO UPDATE SET flag_id = EXCLUDED.flag_id
       RETURNING report_id, affected_package_count, affected_app_count, generated_at`,
      [flagId]
    );

      return { flag_id: flagId, ...reportRows[0] };
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  return NextResponse.json({ report });
}
