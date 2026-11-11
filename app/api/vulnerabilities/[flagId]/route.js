import { NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getSession } from "@/lib/auth/session";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session || session.role !== "security_admin") {
    return NextResponse.json({ error: "security_admin role required" }, { status: 403 });
  }

  const { flagId } = await params;
  const { status } = await request.json();
  if (!["open", "resolved"].includes(status)) {
    return NextResponse.json({ error: "status must be open or resolved" }, { status: 400 });
  }

  const { rows } = await query(
    "UPDATE vulnerability_flag SET status = $1 WHERE flag_id = $2 RETURNING flag_id, status",
    [status, flagId]
  );
  if (!rows[0]) {
    return NextResponse.json({ error: "flag not found" }, { status: 404 });
  }
  return NextResponse.json({ flag: rows[0] });
}
