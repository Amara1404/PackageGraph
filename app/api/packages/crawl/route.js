import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/postgres";
import { getMetadataCollection } from "@/lib/db/mongo";
import { crawl } from "@/lib/crawler";
import { getSession } from "@/lib/auth/session";

const NPM_NAME_RE = /^(@[a-z0-9-_.]+\/)?[a-z0-9-_.]+$/;

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "login required" }, { status: 401 });

  const { name, depth } = await request.json();
  if (!name || !NPM_NAME_RE.test(name)) {
    return NextResponse.json(
      { error: "invalid package name — use the exact published npm name, e.g. \"express\" or \"@scope/name\" (lowercase, hyphens/dots/underscores only)" },
      { status: 400 }
    );
  }

  const pool = getPool();
  const metaCol = await getMetadataCollection();
  const { packageIdByName, packageCount, edgeCount } = await crawl(pool, metaCol, [name], depth ?? 1);

  if (!packageIdByName.has(name)) {
    return NextResponse.json({ error: `"${name}" was not found on the npm registry` }, { status: 404 });
  }

  return NextResponse.json({ packageCount, edgeCount });
}
