const REGISTRY = process.env.NPM_REGISTRY_URL || "https://registry.npmjs.org";

async function fetchPackageDoc(name) {
  const res = await fetch(`${REGISTRY}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`npm registry ${res.status} for ${name}`);
  return res.json();
}

// Resolves a package's latest-version metadata + dependency names.
// Falls back to the last successfully-stored record (Mongo, then Postgres)
// if the live registry call fails, so one dead package doesn't abort the crawl.
export async function resolvePackage(pool, metaCol, name) {
  try {
    const doc = await fetchPackageDoc(name);
    const latest = doc["dist-tags"]?.latest;
    const versionDoc = doc.versions?.[latest] || {};
    return {
      name,
      version: latest || "unknown",
      description: versionDoc.description || doc.description || null,
      dependencies: versionDoc.dependencies || {},
      keywords: versionDoc.keywords || doc.keywords || [],
      maintainers: doc.maintainers || [],
      license: versionDoc.license || doc.license || null,
      readme: doc.readme || null,
    };
  } catch (err) {
    console.warn(`  live fetch failed for ${name} (${err.message}), checking cache...`);
    const cached = await metaCol.findOne({ name });
    if (cached) {
      console.warn(`  using cached metadata for ${name} from last successful crawl`);
      return {
        name,
        version: cached.version,
        description: cached.description,
        dependencies: {}, // dependency edges not cached in Mongo; graph stops here on failure
        keywords: cached.keywords || [],
        maintainers: cached.maintainers || [],
        license: cached.license,
        readme: cached.readme,
      };
    }
    const { rows } = await pool.query(
      "SELECT name, version, description FROM package WHERE name = $1 LIMIT 1",
      [name]
    );
    if (rows[0]) {
      console.warn(`  using cached package row for ${name} from last successful crawl`);
      return { ...rows[0], dependencies: {}, keywords: [], maintainers: [], license: null, readme: null };
    }
    console.error(`  no cached data available for ${name}`);
    return null;
  }
}

export async function upsertPackage(pool, pkg) {
  const { rows } = await pool.query(
    `INSERT INTO package (name, version, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (name, version) DO UPDATE SET description = EXCLUDED.description
     RETURNING package_id`,
    [pkg.name, pkg.version, pkg.description]
  );
  return rows[0].package_id;
}

export async function upsertMetadata(metaCol, pkg) {
  await metaCol.updateOne(
    { name: pkg.name },
    {
      $set: {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        keywords: pkg.keywords,
        maintainers: pkg.maintainers,
        license: pkg.license,
        readme: pkg.readme,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function deleteMetadata(metaCol, name) {
  await metaCol.deleteOne({ name });
}

export async function insertDependency(pool, parentId, childId) {
  try {
    await pool.query(
      `INSERT INTO dependency (parent_package_id, child_package_id)
       VALUES ($1, $2)
       ON CONFLICT (parent_package_id, child_package_id) DO NOTHING`,
      [parentId, childId]
    );
    return true;
  } catch (err) {
    console.warn(`  skipped edge ${parentId} -> ${childId}: ${err.message}`);
    return false;
  }
}

// Breadth-first crawl starting from seedNames, inserting packages + dependency
// edges up to maxDepth. Used by both the CLI crawler and the on-demand
// "fetch from npm" API route.
export async function crawl(pool, metaCol, seedNames, maxDepth) {
  const packageIdByName = new Map(); // name -> package_id, also doubles as "visited"
  const queue = seedNames.map((name) => ({ name, depth: 0, parentName: null }));
  let packageCount = 0;
  let edgeCount = 0;

  while (queue.length > 0) {
    const { name, depth, parentName } = queue.shift();

    let packageId = packageIdByName.get(name);
    const firstVisit = packageId === undefined;

    if (firstVisit) {
      const pkg = await resolvePackage(pool, metaCol, name);
      if (!pkg) continue;

      packageId = await upsertPackage(pool, pkg);
      await upsertMetadata(metaCol, pkg);
      packageIdByName.set(name, packageId);
      packageCount++;

      if (depth < maxDepth) {
        for (const depName of Object.keys(pkg.dependencies || {})) {
          queue.push({ name: depName, depth: depth + 1, parentName: name });
        }
      }
    }

    if (parentName) {
      const parentId = packageIdByName.get(parentName);
      if (parentId && (await insertDependency(pool, parentId, packageId))) {
        edgeCount++;
      }
    }
  }

  return { packageIdByName, packageCount, edgeCount };
}
