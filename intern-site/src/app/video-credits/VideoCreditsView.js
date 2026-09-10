"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { CONTRACTS, DEAD_ADDRESS, isTradingLive } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";

const MIN_CREDIT_USD = 1;
const GENERATION_COST_USD = 1.5;

const PERSONAS = [
  { id: "blaze", label: "Blaze", tagline: "Burn mechanism", img: "/personas/blaze.png" },
  { id: "rendo", label: "Rendo", tagline: "Content", img: "/personas/rendo.png" },
  { id: "promptly", label: "Promptly", tagline: "Prompts", img: "/personas/promptly.png" },
];

const ENGINES = [
  { id: "runway", label: "Runway", desc: "Animate the scene — describe the motion." },
  { id: "heygen", label: "HeyGen", desc: "Make the persona talk — write what they say." },
];

function LiveBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

function useTokenDecimals(address) {
  const { data } = useReadContract({
    address: address || undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: Boolean(address) },
  });
  return data ?? 18;
}

function formatToken(value, decimals, maxFractionDigits = 4) {
  if (value === undefined) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

function TxStatusBanner({ pendingLabel, txHash, isConfirming, isConfirmed, error }) {
  if (!txHash && !error) return null;
  return (
    <div
      className={`rounded-xl border px-4 py-3 mb-4 font-mono text-xs flex items-center justify-between gap-3 ${
        error
          ? "border-[var(--color-danger)]/40 text-[var(--color-danger)]"
          : isConfirmed
            ? "border-[var(--color-accent)]/40 text-[var(--color-accent)]"
            : "border-[var(--color-ember)]/40 text-[var(--color-ember)]"
      }`}
    >
      <span>
        {error
          ? error.shortMessage || error.message || "Transaction failed."
          : isConfirmed
            ? "Burn confirmed."
            : isConfirming
              ? `${pendingLabel} — confirming…`
              : "Waiting for wallet confirmation…"}
      </span>
      {txHash && (
        <a
          href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline shrink-0 opacity-80 hover:opacity-100"
        >
          View on Blockscout ↗
        </a>
      )}
    </div>
  );
}

// Real, live burn -> video-credit top-up. Mirrors Promptly's instant
// top-up (see /inference-credits) but credits an internal balance instead
// of a third-party key, since Runway/HeyGen don't offer customer-scoped
// spend-capped keys the way OpenRouter does.
function BlazeTopUp({ balanceUsd, onCredited }) {
  const { address, isConnected } = useAccount();
  const decimals = useTokenDecimals(CONTRACTS.internToken);

  const { data: balance } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  });

  const [amount, setAmount] = useState("");
  const [priceUsd, setPriceUsd] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [redeemedTx, setRedeemedTx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPrice() {
      try {
        const res = await fetch("/api/promptly/price");
        const data = await res.json();
        if (!cancelled && typeof data.priceUsd === "number") setPriceUsd(data.priceUsd);
      } catch {
        // Live estimate is a nice-to-have; the real calc happens server-side.
      }
    }
    loadPrice();
    const id = setInterval(loadPrice, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const parsedAmount = (() => {
    try {
      return amount ? parseUnits(amount, decimals) : 0n;
    } catch {
      return 0n;
    }
  })();

  const estimatedCreditUsd =
    priceUsd && amount ? Number(amount.replace(/,/g, "") || 0) * priceUsd : null;
  const minAmountNeeded = priceUsd ? MIN_CREDIT_USD / priceUsd : null;

  useEffect(() => {
    if (!isConfirmed || !txHash || txHash === redeemedTx || !address) return;
    setRedeemedTx(txHash);
    setRedeeming(true);
    setApiError(null);
    fetch("/api/blaze/topup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, txHash }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Redemption failed.");
        onCredited(data.newBalanceUsd);
        setAmount("");
      })
      .catch((err) => setApiError(err.message))
      .finally(() => setRedeeming(false));
  }, [isConfirmed, txHash, redeemedTx, address, onCredited]);

  function handleBurn() {
    if (!parsedAmount || parsedAmount <= 0n) return;
    setApiError(null);
    reset();
    writeContract({
      address: CONTRACTS.internToken,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [DEAD_ADDRESS, parsedAmount],
    });
  }

  if (!isConnected) {
    return (
      <div className="w-full max-w-md border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6 text-center">
        <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-5">
          CONNECT TO BURN FOR VIDEO CREDIT
        </p>
        <div className="flex justify-center">
          <ConnectWalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">YOUR $INTERN BALANCE</span>
        <LiveBadge>LIVE</LiveBadge>
      </div>
      <p className="font-mono text-2xl text-[var(--color-fg)] mb-5">{formatToken(balance, decimals, 2)}</p>

      <div className="flex items-center justify-between mb-5 border-t border-[var(--color-line)] pt-4">
        <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">VIDEO CREDIT BALANCE</span>
        <span className="font-mono text-lg text-[var(--color-accent)]">${balanceUsd.toFixed(2)}</span>
      </div>

      <TxStatusBanner
        pendingLabel="Burning"
        txHash={txHash}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={writeError}
      />

      <div className="relative mb-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          disabled={isPending || isConfirming || redeeming}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl pl-4 pr-16 py-3 font-mono text-lg outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => balance && setAmount(formatUnits(balance, decimals))}
          disabled={isPending || isConfirming || redeeming || !balance}
          className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg px-2 py-1 hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-50"
        >
          MAX
        </button>
      </div>

      <p className="font-mono text-[10px] text-[var(--color-muted)] mb-5 leading-relaxed">
        {priceUsd
          ? `≈ $${estimatedCreditUsd?.toFixed(4) ?? "0.0000"} credit at the live price ($${priceUsd.toFixed(8)}/token). Minimum burn: ${minAmountNeeded ? Math.ceil(minAmountNeeded).toLocaleString() : "—"} $INTERN (≈ $${MIN_CREDIT_USD.toFixed(2)}). One generation costs $${GENERATION_COST_USD.toFixed(2)}.`
          : "Fetching live $INTERN price…"}
      </p>

      {apiError && (
        <p className="font-mono text-[10px] text-[var(--color-danger)] mb-4 leading-relaxed">{apiError}</p>
      )}

      <button
        type="button"
        onClick={handleBurn}
        disabled={!parsedAmount || parsedAmount <= 0n || isPending || isConfirming || redeeming}
        className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending
          ? "CONFIRM IN WALLET…"
          : isConfirming
            ? "CONFIRMING BURN…"
            : redeeming
              ? "CREDITING…"
              : "BURN & GET VIDEO CREDIT"}
      </button>
      <p className="mt-4 font-mono text-[10px] text-[var(--color-muted-2)] leading-relaxed">
        Sends a real, irreversible transfer to the dead address, then credits your on-site
        balance — no key to copy, spend it directly below.
      </p>
    </div>
  );
}

function PersonaPicker({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {PERSONAS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={`rounded-xl border p-3 text-center transition-colors ${
            selected === p.id
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              : "border-[var(--color-line)] hover:border-[var(--color-accent)]/40"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.img} alt={p.label} className="w-full aspect-video object-cover rounded-lg mb-2" />
          <p className="font-mono text-xs text-[var(--color-fg)]">{p.label}</p>
          <p className="font-mono text-[10px] text-[var(--color-muted)]">{p.tagline}</p>
        </button>
      ))}
    </div>
  );
}

function EngineTabs({ selected, onSelect }) {
  return (
    <div className="flex gap-2 mb-4">
      {ENGINES.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onSelect(e.id)}
          className={`flex-1 rounded-xl border px-4 py-2.5 text-left transition-colors ${
            selected === e.id
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              : "border-[var(--color-line)] hover:border-[var(--color-accent)]/40"
          }`}
        >
          <p className="font-mono text-xs text-[var(--color-fg)] mb-0.5">{e.label}</p>
          <p className="font-mono text-[10px] text-[var(--color-muted)] leading-snug">{e.desc}</p>
        </button>
      ))}
    </div>
  );
}

// Spends video credit on a real generation, then polls this site's own
// status endpoint (never the provider directly) until a video lands.
function Generator({ balanceUsd, onSpent }) {
  const { address, isConnected } = useAccount();
  const [persona, setPersona] = useState("blaze");
  const [engine, setEngine] = useState("runway");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState(null); // { engine, taskId, status, videoUrl }
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!job || job.status === "ready" || job.status === "failed") return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/blaze/generate?engine=${job.engine}&taskId=${job.taskId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Status check failed.");
        setJob((j) => (j ? { ...j, status: data.status, videoUrl: data.videoUrl } : j));
      } catch (err) {
        setError(err.message);
      }
    }, 6000);
    return () => clearInterval(id);
  }, [job]);

  async function handleGenerate() {
    if (!prompt.trim() || balanceUsd < GENERATION_COST_USD) return;
    setSubmitting(true);
    setError(null);
    setJob(null);
    try {
      const res = await fetch("/api/blaze/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, engine, persona, prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start that generation.");
      onSpent(data.newBalanceUsd);
      setJob({ engine: data.engine, taskId: data.taskId, status: "queued", videoUrl: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isConnected) return null;

  return (
    <div className="w-full max-w-md border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-4">GENERATE</p>

      <PersonaPicker selected={persona} onSelect={setPersona} />
      <div className="h-4" />
      <EngineTabs selected={engine} onSelect={setEngine} />

      <textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
        placeholder={
          engine === "heygen"
            ? "What should this persona say?"
            : "Describe subtle motion — e.g. embers drift, ticker ticks down, camera static."
        }
        disabled={submitting}
        className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-xs outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50 resize-none mb-4"
      />

      {error && <p className="font-mono text-[10px] text-[var(--color-danger)] mb-4 leading-relaxed">{error}</p>}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!prompt.trim() || balanceUsd < GENERATION_COST_USD || submitting}
        className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "STARTING…" : `GENERATE — $${GENERATION_COST_USD.toFixed(2)}`}
      </button>

      {balanceUsd < GENERATION_COST_USD && (
        <p className="mt-3 font-mono text-[10px] text-[var(--color-muted)]">
          Need ${(GENERATION_COST_USD - balanceUsd).toFixed(2)} more credit — burn above first.
        </p>
      )}

      {job && (
        <div className="mt-5 border-t border-[var(--color-line)] pt-4">
          {job.status === "ready" && job.videoUrl ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={job.videoUrl} controls className="w-full rounded-xl border border-[var(--color-line)]" />
              <a
                href={job.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center font-mono text-xs text-[var(--color-accent)] hover:underline"
              >
                Open full video ↗
              </a>
            </div>
          ) : job.status === "failed" ? (
            <p className="font-mono text-xs text-[var(--color-danger)]">
              That generation failed on the provider&apos;s side. Credit already spent isn&apos;t
              auto-refunded yet — contact the team with this task ID: {job.taskId}
            </p>
          ) : (
            <p className="font-mono text-xs text-[var(--color-ember)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ember)] ember-pulse" />
              {job.status === "queued" ? "Queued…" : "Processing…"} usually 30s–3min.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoCreditsView() {
  const { address, isConnected } = useAccount();
  const live = isTradingLive();
  const [balanceUsd, setBalanceUsd] = useState(0);

  useEffect(() => {
    if (!address) {
      setBalanceUsd(0);
      return;
    }
    fetch(`/api/blaze/topup?address=${address}`)
      .then((res) => res.json())
      .then((data) => setBalanceUsd(data.balanceUsd ?? 0))
      .catch(() => {});
  }, [address, isConnected]);

  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-5xl mx-auto w-full">
        <Reveal className="flex flex-wrap items-center gap-3 mb-4">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
            MEET BLAZE · VIDEO INTERN
          </p>
          <LiveBadge>LIVE</LiveBadge>
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Burn $INTERN. Generate real video.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-4">
          The video half of the same idea{" "}
          <Link href="/inference-credits" className="text-[var(--color-accent)] hover:underline">
            Promptly
          </Link>{" "}
          already ships for text: burn $INTERN at the live price, spend the credit on a real
          Runway or HeyGen generation of Blaze, Rendo, or Promptly — right here, no key to copy.
        </Reveal>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
        {!live ? (
          <div className="w-full max-w-md border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6 text-center">
            <p className="font-mono text-sm text-[var(--color-muted)]">$INTERN isn&apos;t live yet.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="flex flex-col lg:flex-row gap-6 items-start"
          >
            <motion.div variants={fadeUp}>
              <BlazeTopUp balanceUsd={balanceUsd} onCredited={setBalanceUsd} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <Generator balanceUsd={balanceUsd} onSpent={setBalanceUsd} />
            </motion.div>
          </motion.div>
        )}
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-10 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest mb-3">
            PART OF BURN TO CREATE
          </p>
          <p className="text-[var(--color-fg)] text-lg mb-6 max-w-xl mx-auto">
            Video generations count toward the{" "}
            <Link href="/burn-to-create" className="text-[var(--color-accent)] hover:underline">
              Burn to Create
            </Link>{" "}
            campaign too — submit what you make for the same prizes.
          </p>
          <Link
            href="/burn-to-create"
            className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            SEE THE CAMPAIGN →
          </Link>
        </Reveal>
      </section>
    </>
  );
}
