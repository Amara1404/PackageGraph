"use client";

import { Fragment, useEffect, useState } from "react";
import Card from "@/components/Card";
import Badge from "@/components/Badge";

const SEVERITY_TONE = {
  CRITICAL: "danger",
  HIGH: "danger",
  MODERATE: "attention",
  MEDIUM: "attention",
  LOW: "neutral",
};

export default function ImpactReports() {
  const [flags, setFlags] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function load() {
    const res = await fetch("/api/vulnerabilities");
    const data = await res.json();
    setFlags(data.flags || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(flagId) {
    await fetch(`/api/vulnerabilities/${flagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    load();
  }

  async function toggleExpand(flagId) {
    if (expanded === flagId) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(flagId);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/vulnerabilities/${flagId}/impact`);
      setDetail(await res.json());
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <Card>
      <table className="text-sm -m-3 w-[calc(100%+1.5rem)]">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            <th className="px-3 py-2 font-medium">Package</th>
            <th className="px-3 py-2 font-medium">OSV ID</th>
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Packages hit</th>
            <th className="px-3 py-2 font-medium">Apps hit</th>
            <th className="px-3 py-2 font-medium">Flagged by</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <Fragment key={f.flag_id}>
              <tr
                onClick={() => toggleExpand(f.flag_id)}
                className="border-b border-[var(--color-border)] last:border-0 cursor-pointer hover:bg-[var(--color-canvas-subtle)]"
              >
                <td className="px-3 py-2 font-mono text-xs">
                  {f.package_name}@{f.package_version}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{f.osv_id}</td>
                <td className="px-3 py-2">
                  {f.severity ? (
                    <Badge tone={SEVERITY_TONE[String(f.severity).toUpperCase()] || "neutral"}>{f.severity}</Badge>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={f.status === "open" ? "danger" : "success"}>{f.status}</Badge>
                </td>
                <td className="px-3 py-2">{f.affected_package_count ?? "-"}</td>
                <td className="px-3 py-2">{f.affected_app_count ?? "-"}</td>
                <td className="px-3 py-2 text-[var(--color-fg-muted)]">{f.flagged_by}</td>
                <td className="px-3 py-2">
                  {f.status === "open" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resolve(f.flag_id);
                      }}
                      className="text-xs border border-[var(--color-border)] rounded-md px-2 py-1 hover:bg-[var(--color-btn-hover-bg)]"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
              {expanded === f.flag_id && (
                <tr className="border-b border-[var(--color-border)] last:border-0 bg-[var(--color-canvas-subtle)]">
                  <td colSpan={8} className="px-3 py-3">
                    {loadingDetail && <p className="text-xs text-[var(--color-fg-muted)]">Loading...</p>}
                    {!loadingDetail && detail && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1.5">
                            Affected packages ({detail.packages.length})
                          </h4>
                          <ul className="text-xs font-mono border border-[var(--color-border)] rounded-md bg-[var(--color-canvas)] max-h-40 overflow-y-auto divide-y divide-[var(--color-border)]">
                            {detail.packages.map((p) => (
                              <li key={p.package_id} className="px-2 py-1">
                                {p.name}@{p.version}
                              </li>
                            ))}
                            {detail.packages.length === 0 && (
                              <li className="px-2 py-1 text-[var(--color-fg-muted)] font-sans">None</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-1.5">
                            Affected applications ({detail.applications.length})
                          </h4>
                          <ul className="text-xs border border-[var(--color-border)] rounded-md bg-[var(--color-canvas)] max-h-40 overflow-y-auto divide-y divide-[var(--color-border)]">
                            {detail.applications.map((a) => (
                              <li key={a.app_id} className="px-2 py-1">
                                {a.name}{" "}
                                <span className="text-[var(--color-fg-muted)]">({a.owner_username})</span>
                              </li>
                            ))}
                            {detail.applications.length === 0 && (
                              <li className="px-2 py-1 text-[var(--color-fg-muted)]">None</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {flags.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-4 text-[var(--color-fg-muted)] text-sm">
                No vulnerabilities flagged yet — flag one from the Packages page.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
