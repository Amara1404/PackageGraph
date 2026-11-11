import { config } from "dotenv";
config({ path: ".env.local" });

import { getPool } from "../lib/db/postgres.js";
import { getMetadataCollection } from "../lib/db/mongo.js";
import { crawl } from "../lib/crawler.js";

function parseArgs(argv) {
  const names = [];
  let depth = 3;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--depth") {
      depth = Number(argv[++i]);
    } else {
      names.push(argv[i]);
    }
  }
  return { names, depth };
}

const { names, depth } = parseArgs(process.argv.slice(2));
if (names.length === 0) {
  console.error("usage: node scripts/crawl.js <pkg> [<pkg> ...] [--depth N]");
  process.exit(1);
}

const pool = getPool();
const metaCol = await getMetadataCollection();

const { packageCount, edgeCount } = await crawl(pool, metaCol, names, depth);
console.log(`crawl complete: ${packageCount} packages, ${edgeCount} dependency edges`);

await pool.end();
process.exit(0);
