"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Invalid credentials");
        return;
      }
      router.push("/dashboard/packages");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 bg-[var(--color-canvas-subtle)]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm flex flex-col gap-3 border border-[var(--color-border)] rounded-md bg-[var(--color-canvas)] p-6"
      >
        <h1 className="text-lg font-semibold text-center mb-1">PackageGraph</h1>
        <p className="text-xs text-[var(--color-fg-muted)] text-center mb-2">
          Recursive dependency &amp; vulnerability impact tracker
        </p>
        <TextInput placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <TextInput
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
