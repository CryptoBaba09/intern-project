"use client";

import { useEffect, useState } from "react";

// Same pattern as admin/roster/AdminRosterView.js -- see that file's
// comment for why this isn't linked from Nav and how the secret is
// handled.
export default function AdminBurnToCreateView() {
  const [secret, setSecret] = useState("");
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("admin-secret");
      if (saved) {
        setSecret(saved);
        load(saved);
      }
    } catch {
      // sessionStorage blocked -- just start logged out, harmless
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(token) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/burn-to-create-submissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setSubmissions(data.submissions);
      try {
        sessionStorage.setItem("admin-secret", token);
      } catch {
        // harmless if blocked
      }
    } catch (err) {
      setError(err.message);
      setSubmissions(null);
    } finally {
      setLoading(false);
    }
  }

  if (submissions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(secret);
          }}
          className="border border-[var(--color-line)] rounded-2xl p-8 w-full max-w-sm space-y-4"
        >
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest">ADMIN</p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50"
          />
          {error && <p className="text-sm text-[var(--color-ember)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "View submissions"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-6 py-16 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-semibold mb-2">Burn to Create submissions</h1>
      <p className="text-sm text-[var(--color-muted)] mb-8">
        {submissions.length} total, newest first.
      </p>
      <div className="space-y-4">
        {submissions.map((s) => (
          <div key={s.id} className="border border-[var(--color-line)] rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <a
                href={s.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--color-accent)] hover:underline break-all"
              >
                {s.videoLink}
              </a>
              <span className="font-mono text-xs text-[var(--color-muted-2)] shrink-0">
                {new Date(s.createdAt).toLocaleString()}
              </span>
            </div>
            {s.note && (
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-3">{s.note}</p>
            )}
            <p className="font-mono text-xs text-[var(--color-muted-2)]">{s.wallet}</p>
          </div>
        ))}
        {submissions.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">No submissions yet.</p>
        )}
      </div>
    </div>
  );
}
