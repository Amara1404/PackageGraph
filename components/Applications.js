"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import TextInput from "@/components/TextInput";

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(null);
  const [appPackages, setAppPackages] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  async function loadApps() {
    const res = await fetch("/api/applications");
    const data = await res.json();
    setApps(data.applications || []);
  }

  useEffect(() => {
    loadApps();
  }, []);

  async function createApp(e) {
    e.preventDefault();
    if (!name) return;
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    loadApps();
  }

  async function selectApp(app) {
    setSelected(app);
    setResults(null);
    setQ("");
    setFetchError("");
    const res = await fetch(`/api/applications/${app.app_id}/packages`);
    const data = await res.json();
    setAppPackages(data.packages || []);
  }

  async function runSearch(term) {
    setSearching(true);
    try {
      const res = await fetch(`/api/packages?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setResults(data.packages || []);
    } finally {
      setSearching(false);
    }
  }

  function searchPackages(e) {
    e.preventDefault();
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

  async function addPackage(pkg) {
    const res = await fetch(`/api/applications/${selected.app_id}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: pkg.package_id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFetchError(data.error || "could not add package");
      return;
    }
    selectApp(selected);
  }

  async function removePackage(pkg) {
    await fetch(`/api/applications/${selected.app_id}/packages/${pkg.package_id}`, { method: "DELETE" });
    selectApp(selected);
  }

  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      <Card title="Your applications">
        <form onSubmit={createApp} className="flex gap-2 mb-3">
          <TextInput
            className="flex-1"
            placeholder="New application name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button variant="primary">Add</Button>
        </form>
        <ul className="text-sm border border-[var(--color-border)] rounded-md divide-y divide-[var(--color-border)] overflow-hidden">
          {apps.map((a) => (
            <li
              key={a.app_id}
              onClick={() => selectApp(a)}
              className={`px-3 py-2 cursor-pointer hover:bg-[var(--color-canvas-subtle)] ${
                selected?.app_id === a.app_id ? "bg-[var(--color-canvas-subtle)]" : ""
              }`}
            >
              <div>{a.name}</div>
              <div className="text-xs text-[var(--color-fg-muted)]">{a.owner_username}</div>
            </li>
          ))}
          {apps.length === 0 && <li className="px-3 py-3 text-[var(--color-fg-muted)] text-sm">No applications yet</li>}
        </ul>
      </Card>

      <Card title={selected ? `${selected.name} uses` : "Packages used"}>
        {!selected && <p className="text-sm text-[var(--color-fg-muted)]">Select an application first.</p>}
        {selected && (
          <ul className="text-sm border border-[var(--color-border)] rounded-md divide-y divide-[var(--color-border)]">
            {appPackages.map((p) => (
              <li key={p.package_id} className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="font-mono text-xs">
                  {p.name}@{p.version}
                </span>
                <button
                  onClick={() => removePackage(p)}
                  className="text-xs text-[var(--color-danger)] hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
            {appPackages.length === 0 && <li className="px-3 py-3 text-[var(--color-fg-muted)] text-sm">None</li>}
          </ul>
        )}
      </Card>

      <Card title="Add a package">
        {!selected && <p className="text-sm text-[var(--color-fg-muted)]">Select an application first.</p>}
        {selected && (
          <>
            <form onSubmit={searchPackages} className="flex gap-2">
              <TextInput
                className="flex-1"
                placeholder="npm package name, e.g. express"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button disabled={searching}>{searching ? "..." : "Search"}</Button>
            </form>
            <p className="text-xs text-[var(--color-fg-muted)] mt-2">
              Exact published npm name. Not found? Fetch it from npm below.
            </p>

            {results && (
              <ul className="text-sm border border-[var(--color-border)] rounded-md mt-3 divide-y divide-[var(--color-border)] overflow-hidden">
                {results.map((p) => (
                  <li key={p.package_id} className="px-3 py-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">
                      {p.name}@{p.version}
                    </span>
                    <button onClick={() => addPackage(p)} className="text-xs text-[var(--color-accent)] hover:underline">
                      add
                    </button>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="px-3 py-3 flex items-center justify-between gap-2">
                    <span className="text-[var(--color-fg-muted)] text-xs">Not in the catalog yet.</span>
                    <Button onClick={fetchFromNpm} disabled={fetching} className="shrink-0">
                      {fetching ? "Fetching..." : "Fetch from npm"}
                    </Button>
                  </li>
                )}
              </ul>
            )}
            {fetchError && <p className="text-sm text-[var(--color-danger)] mt-2">{fetchError}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
