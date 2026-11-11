"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import TextInput from "@/components/TextInput";
import Badge from "@/components/Badge";

export default function PackageExplorer({ role }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selected, setSelected] = useState(null);
  const [explode, setExplode] = useState(null);
  const [implode, setImplode] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [osvId, setOsvId] = useState("");
  const [flagMsg, setFlagMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function runSearch(term) {
    setSearching(true);
    try {
      const res = await fetch(`/api/packages?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setResults(data.packages);
    } finally {
      setSearching(false);
    }
  }

  function search(e) {
    e?.preventDefault();
    setFetchError("");
    runSearch(q);
  }

  async function fetchFromNpm() {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/packages/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: q.trim(), depth: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "fetch failed");
        return;
      }
      await runSearch(q);
    } finally {
      setFetching(false);
    }
  }

  async function select(pkg) {
    setSelected(pkg);
    setImplode(null);
    setFlagMsg("");
    const [explodeRes, metaRes] = await Promise.all([
      fetch(`/api/packages/${pkg.package_id}/explode`),
      fetch(`/api/packages/${pkg.package_id}/metadata`),
    ]);
    setExplode((await explodeRes.json()).dependencies);
    setMetadata((await metaRes.json()).metadata);
  }

  async function loadImplode() {
    const res = await fetch(`/api/packages/${selected.package_id}/implode`);
    setImplode((await res.json()).impacted);
  }

  async function deletePackage() {
    if (!confirm(`Delete ${selected.name}@${selected.version}? This removes it from the dependency graph.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/packages/${selected.package_id}`, { method: "DELETE" });
      if (res.ok) {
        setSelected(null);
        setExplode(null);
        setImplode(null);
        setMetadata(null);
        await runSearch(q);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function flagVulnerability(e) {
    e.preventDefault();
    setFlagMsg("");
    const res = await fetch("/api/vulnerabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: selected.package_id, osv_id: osvId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFlagMsg(data.error || "failed");
      return;
    }
    setFlagMsg(
      `Impact report: ${data.report.affected_package_count} packages, ${data.report.affected_app_count} applications`
    );
    setOsvId("");
    loadImplode();
  }

  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      <Card title="Search">
        <form onSubmit={search} className="flex gap-2">
          <TextInput
            className="flex-1"
            placeholder="npm package name, e.g. express"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button disabled={searching}>{searching ? "..." : "Search"}</Button>
        </form>
        <p className="text-xs text-[var(--color-fg-muted)] mt-2">
          Exact published npm name (lowercase, hyphens/dots/underscores, optional @scope/name).
        </p>

        {results && (
          <ul className="text-sm border border-[var(--color-border)] rounded-md mt-3 divide-y divide-[var(--color-border)] overflow-hidden">
            {results.map((p) => (
              <li
                key={p.package_id}
                onClick={() => select(p)}
                className={`px-3 py-2 cursor-pointer hover:bg-[var(--color-canvas-subtle)] ${
                  selected?.package_id === p.package_id ? "bg-[var(--color-canvas-subtle)]" : ""
                }`}
              >
                <span className="font-mono text-xs">{p.name}</span>
                <span className="text-[var(--color-fg-muted)] font-mono text-xs">@{p.version}</span>
                <span className="text-[var(--color-fg-muted)] text-xs ml-2">used by {p.dependent_count}</span>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-3 flex items-center justify-between gap-2">
                <span className="text-[var(--color-fg-muted)] text-xs">
                  Not in the catalog yet{q ? ` ("${q}")` : ""}.
                </span>
                {q && (
                  <Button onClick={fetchFromNpm} disabled={fetching} className="shrink-0">
                    {fetching ? "Fetching..." : "Fetch from npm"}
                  </Button>
                )}
              </li>
            )}
          </ul>
        )}
        {fetchError && <p className="text-sm text-[var(--color-danger)] mt-2">{fetchError}</p>}
      </Card>

      <Card title={selected ? `${selected.name}@${selected.version}` : "Dependency graph"}>
        {!selected && <p className="text-sm text-[var(--color-fg-muted)]">Select a package to explore its graph.</p>}
        {selected && (
          <>
            {metadata?.description && (
              <p className="text-sm text-[var(--color-fg-muted)] mb-3">{metadata.description}</p>
            )}

            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mt-1 mb-1.5">
              Depends on ({explode?.length ?? 0})
            </h3>
            <ul className="text-sm max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-md divide-y divide-[var(--color-border)]">
              {explode?.map((d) => (
                <li key={d.package_id} className="px-3 py-1.5 font-mono text-xs" style={{ paddingLeft: `${12 + d.depth * 14}px` }}>
                  {d.name}@{d.version}
                </li>
              ))}
              {explode?.length === 0 && <li className="px-3 py-2 text-[var(--color-fg-muted)] text-sm">No dependencies</li>}
            </ul>

            <div className="flex items-center gap-2 mt-3">
              <Button onClick={loadImplode}>Show impact</Button>
              {role === "security_admin" && (
                <Button variant="danger" onClick={deletePackage} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete package"}
                </Button>
              )}
            </div>
            {implode && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mt-3 mb-1.5">
                  Depended on by ({implode.length})
                </h3>
                <ul className="text-sm max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-md divide-y divide-[var(--color-border)]">
                  {implode.map((d) => (
                    <li key={d.package_id} className="px-3 py-1.5 font-mono text-xs">
                      {d.name}@{d.version}
                    </li>
                  ))}
                  {implode.length === 0 && <li className="px-3 py-2 text-[var(--color-fg-muted)] text-sm">None</li>}
                </ul>
              </>
            )}
          </>
        )}
      </Card>

      {role === "security_admin" && (
        <Card title="Flag vulnerability">
          {!selected && <p className="text-sm text-[var(--color-fg-muted)]">Select a package first.</p>}
          {selected && (
            <form onSubmit={flagVulnerability} className="flex flex-col gap-2">
              <TextInput
                placeholder="OSV id, e.g. GHSA-xxxx-xxxx-xxxx"
                value={osvId}
                onChange={(e) => setOsvId(e.target.value)}
              />
              <p className="text-xs text-[var(--color-fg-muted)]">
                Looked up live from osv.dev — use a real OSV/GHSA/CVE id.
              </p>
              <Button type="submit" variant="primary">
                Flag {selected.name}
              </Button>
              {flagMsg && (
                <Badge tone={flagMsg.startsWith("Impact") ? "success" : "danger"}>{flagMsg}</Badge>
              )}
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
