"use client";

import { useEffect, useState } from "react";
import BurnMascotScene from "../components/BurnMascotScene";
import InternFamilyScene from "../components/InternFamilyScene";
import { Reveal } from "../components/motion";

function useSubmissionCount() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/roster/submit")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCount(data.count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function refetch() {
    fetch("/api/roster/submit")
      .then((res) => res.json())
      .then((data) => setCount(data.count))
      .catch(() => {});
  }

  return [count, refetch];
}

function SubmissionForm({ onSubmitted }) {
  const [role, setRole] = useState("");
  const [pitch, setPitch] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/roster/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pitch, submitterName, wallet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStatus("done");
      setRole("");
      setPitch("");
      setSubmitterName("");
      setWallet("");
      onSubmitted?.();
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  if (status === "done") {
    return (
      <div className="border border-[var(--color-accent)]/30 rounded-2xl p-8 text-center">
        <p className="text-lg font-medium mb-2">Idea logged.</p>
        <p className="text-sm text-[var(--color-muted)]">
          Treasury reviews submissions by hand — there&apos;s no automatic payout yet, see the note
          below. Want to submit another?
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 font-mono text-sm text-[var(--color-accent)] hover:underline"
        >
          SUBMIT ANOTHER IDEA →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--color-line)] rounded-2xl p-8 space-y-4">
      <div>
        <label className="block font-mono text-xs text-[var(--color-muted)] mb-2">
          NEW INTERN&apos;S ROLE *
        </label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          maxLength={80}
          required
          placeholder="e.g. Legal Intern, Trading Intern..."
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50"
        />
      </div>
      <div>
        <label className="block font-mono text-xs text-[var(--color-muted)] mb-2">
          WHAT WOULD THEY ACTUALLY DO? *
        </label>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          maxLength={500}
          required
          rows={3}
          placeholder="One or two sentences on the real utility this intern would provide."
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50 resize-none"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-xs text-[var(--color-muted)] mb-2">
            YOUR NAME (OPTIONAL)
          </label>
          <input
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            maxLength={60}
            placeholder="Anonymous is fine"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50"
          />
        </div>
        <div>
          <label className="block font-mono text-xs text-[var(--color-muted)] mb-2">
            WALLET FOR PAYOUT (OPTIONAL)
          </label>
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50"
          />
        </div>
      </div>
      {status === "error" && (
        <p className="text-sm text-[var(--color-ember)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
      >
        {status === "submitting" ? "SUBMITTING..." : "SUBMIT YOUR INTERN IDEA →"}
      </button>
    </form>
  );
}

export default function RosterView() {
  const [count, refetchCount] = useSubmissionCount();

  return (
    <>
      <section className="px-6 pt-16 pb-20 max-w-6xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="max-w-xl">
            <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4">
              ROSTER CALL · REAL SUBMISSIONS, MANUAL PAYOUT
            </Reveal>
            <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold leading-[1.05] mb-6">
              $INTERN don&apos;t get equity.
              <br />
              They get burned.
            </Reveal>
            <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed mb-6">
              Five interns are live. More are coming, and the community picks what they do. Pitch a
              role you&apos;d actually want $INTERN to do for you — content, trading, capital
              management, whatever — and if treasury picks it up, the winner gets paid in $INTERN
              from the treasury wallet.
            </Reveal>
            <Reveal delay={0.15} className="font-mono text-xs text-[var(--color-muted-2)]">
              {count === null ? "..." : count} idea{count === 1 ? "" : "s"} submitted so far
            </Reveal>
          </div>
          <Reveal delay={0.2} className="shrink-0 w-64 sm:w-80">
            <BurnMascotScene />
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-16 max-w-6xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          THE CREW TODAY
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10 max-w-xl">
          Five jobs, all real. Yours could be the seventh.
        </Reveal>
        <Reveal delay={0.1}>
          <InternFamilyScene />
        </Reveal>
      </section>

      <section className="px-6 py-16 max-w-2xl mx-auto w-full">
        <Reveal as="h2" className="text-2xl font-semibold mb-2">
          Pitch the next intern
        </Reveal>
        <Reveal delay={0.05} className="text-sm text-[var(--color-muted)] mb-8 leading-relaxed">
          <strong>What&apos;s real right now:</strong> this form writes to a real database, and every
          submission gets read. <strong>What&apos;s not built yet:</strong> there&apos;s no automatic
          selection or on-chain payout. The team reviews ideas and pays chosen ones in $INTERN by
          hand from the treasury wallet — same discretionary pattern as this site&apos;s other
          treasury-funded features. If that changes to something automatic, this notice changes
          with it.
        </Reveal>
        <Reveal delay={0.1}>
          <SubmissionForm onSubmitted={refetchCount} />
        </Reveal>
      </section>
    </>
  );
}
