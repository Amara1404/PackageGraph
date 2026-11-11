const OSV_API_URL = process.env.OSV_API_URL || "https://api.osv.dev/v1/vulns";

// Fetches a vulnerability record from OSV.dev and flattens it into the shape
// our schema stores. Returns null (never throws) so callers can fall back to
// whatever was cached from the last successful fetch.
export async function fetchOsvVuln(osvId) {
  try {
    const res = await fetch(`${OSV_API_URL}/${encodeURIComponent(osvId)}`);
    if (!res.ok) throw new Error(`OSV API ${res.status}`);
    const doc = await res.json();

    const severity =
      doc.database_specific?.severity || doc.severity?.[0]?.score || doc.severity?.[0]?.type || null;

    const affectedRanges = [];
    for (const affected of doc.affected || []) {
      const packageName = affected.package?.name;
      if (!packageName) continue;
      for (const range of affected.ranges || []) {
        const introduced = range.events?.find((e) => e.introduced !== undefined)?.introduced ?? null;
        const fixed = range.events?.find((e) => e.fixed !== undefined)?.fixed ?? null;
        affectedRanges.push({ packageName, introduced, fixed });
      }
      if (!affected.ranges?.length) {
        affectedRanges.push({ packageName, introduced: null, fixed: null });
      }
    }

    return {
      osvId: doc.id || osvId,
      severity,
      summary: doc.summary || doc.details || null,
      affectedRanges,
    };
  } catch (err) {
    console.warn(`OSV.dev fetch failed for ${osvId}: ${err.message}`);
    return null;
  }
}
