"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const ICONS = {
  packages: (
    <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3ZM5 9.6l6 3.4v6.9l-6-3.3V9.6Zm8 10.3v-6.9l6-3.4v6.9l-6 3.4Z" />
  ),
  applications: (
    <path d="M3 4h18v2H3V4Zm0 7h18v2H3v-2Zm0 7h18v2H3v-2Z" />
  ),
  vulnerabilities: (
    <path d="M12 2 1 21h22L12 2Zm0 4.5 7.5 13h-15L12 6.5ZM11 10v5h2v-5h-2Zm0 6v2h2v-2h-2Z" />
  ),
};

function NavItem({ href, label, icon, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
        active
          ? "bg-[var(--color-canvas)] font-medium text-[var(--color-fg)] border border-[var(--color-border)]"
          : "text-[var(--color-fg-muted)] hover:bg-[var(--color-btn-hover-bg)] border border-transparent"
      }`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="shrink-0">
        {icon}
      </svg>
      {label}
    </Link>
  );
}

export default function Sidebar({ username, role }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-sidebar)] flex flex-col min-h-full">
      <div className="px-4 py-4 border-b border-[var(--color-border)]">
        <Link href="/dashboard/packages" className="font-semibold text-[var(--color-fg)]">
          PackageGraph
        </Link>
      </div>

      <div className="px-3 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <div className="text-xs leading-tight min-w-0">
          <div className="font-medium text-[var(--color-fg)] truncate">{username}</div>
          <div className="text-[var(--color-fg-muted)]">{role === "security_admin" ? "Security Admin" : "Developer"}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-xs border border-[var(--color-border)] rounded-md px-2 py-1 hover:bg-[var(--color-btn-hover-bg)] text-[var(--color-fg-muted)]"
          >
            Log out
          </button>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        <NavItem
          href="/dashboard/packages"
          label="Packages"
          icon={ICONS.packages}
          active={pathname.startsWith("/dashboard/packages")}
        />
        <NavItem
          href="/dashboard/applications"
          label="Applications"
          icon={ICONS.applications}
          active={pathname.startsWith("/dashboard/applications")}
        />
        {role === "security_admin" && (
          <NavItem
            href="/dashboard/vulnerabilities"
            label="Vulnerabilities"
            icon={ICONS.vulnerabilities}
            active={pathname.startsWith("/dashboard/vulnerabilities")}
          />
        )}
      </nav>
    </aside>
  );
}
