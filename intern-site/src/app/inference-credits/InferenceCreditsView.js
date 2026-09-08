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

const MIN_CREDIT_USD = 0.1;

function LiveBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

function PreviewBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2.5 py-1 tracking-widest">
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

function CopyableKey({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 truncate bg-[var(--color-bg)] border border-[var(--color-line)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--color-fg)]">
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 font-mono text-[10px] font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg px-2.5 py-2 hover:bg-[var(--color-accent)]/10 transition-colors"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}

// Real, live "instant top-up" tool: burn $INTERN, get a real spend-capped
// OpenRouter key. This is deliberately the ONLY half of Promptly that's
// live -- see the copy above for what's still a mockup.
function PromptlyTopUp() {
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
  const [result, setResult] = useState(null);
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
        // Live estimate is a nice-to-have; the real calculation happens
        // server-side on redemption regardless.
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
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

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

  // Redeem automatically the moment the burn confirms.
  useEffect(() => {
    if (!isConfirmed || !txHash || txHash === redeemedTx || !address) return;
    setRedeemedTx(txHash);
    setRedeeming(true);
    setApiError(null);
    fetch("/api/promptly/topup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, txHash }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Redemption failed.");
        setResult(data);
      })
      .catch((err) => setApiError(err.message))
      .finally(() => setRedeeming(false));
  }, [isConfirmed, txHash, redeemedTx, address]);

  function handleBurn() {
    if (!parsedAmount || parsedAmount <= 0n) return;
    setResult(null);
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
          CONNECT TO BURN FOR CREDIT
        </p>
        <div className="flex justify-center">
          <ConnectWalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-5">
        <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">YOUR $INTERN BALANCE</span>
        <LiveBadge>LIVE</LiveBadge>
      </div>
      <p className="font-mono text-3xl text-[var(--color-fg)] mb-6">{formatToken(balance, decimals, 2)}</p>

      <TxStatusBanner
        pendingLabel="Burning"
        txHash={txHash}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={writeError}
      />

      {result ? (
        <div className="space-y-3">
          <p className="font-mono text-xs text-[var(--color-accent)]">
            {result.status === "created" ? "Key created." : "Key topped up."} {result.message}
          </p>
          {result.key && <CopyableKey value={result.key} />}
          <p className="font-mono text-[10px] text-[var(--color-muted)]">
            Burned {result.amountBurned.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
            $INTERN at ${result.priceUsdAtBurn.toFixed(8)} → $
            {(result.creditUsd ?? result.creditAddedUsd).toFixed(4)} credit
            {result.newLimitUsd ? ` (new total limit $${result.newLimitUsd.toFixed(4)})` : ""}.
          </p>
        </div>
      ) : (
        <>
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
              ? `≈ $${estimatedCreditUsd?.toFixed(4) ?? "0.0000"} credit at the live price ($${priceUsd.toFixed(8)}/token). Minimum burn: ${minAmountNeeded ? Math.ceil(minAmountNeeded).toLocaleString() : "—"} $INTERN (≈ $${MIN_CREDIT_USD.toFixed(2)}).`
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
                  : "BURN & GET CREDIT"}
          </button>
          <p className="mt-4 font-mono text-[10px] text-[var(--color-muted-2)] leading-relaxed">
            Sends a real, irreversible transfer to the dead address, then provisions a real,
            spend-capped OpenRouter key — no wrapper, nothing to install.
          </p>
        </>
      )}
    </div>
  );
}

const MODELS = ["Claude", "GPT", "Gemini", "DeepSeek", "Kimi", "+ more via OpenRouter"];

export default function InferenceCreditsView() {
  const live = isTradingLive();

  return (
    <>
      <section className="px-6 pt-16 pb-16 max-w-5xl mx-auto w-full">
        <Reveal className="flex flex-wrap items-center gap-3 mb-4">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
            MEET PROMPTLY · INFERENCE INTERN
          </p>
          <LiveBadge>DIRECT TOP-UP · LIVE</LiveBadge>
          <PreviewBadge>STAKING POOL · NOT LIVE</PreviewBadge>
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Burn $INTERN. Get real AI credit.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-4"
        >
          The instant top-up is live today: burn $INTERN at the live price, get a real,
          spend-capped OpenRouter key back — spendable on Claude, GPT, Gemini, and hundreds of
          other models. The other half of the vision — staked $INTERN earning a pro-rata share of
          treasury-funded credit automatically — isn&apos;t live yet, because there&apos;s no real
          treasury fee revenue flowing to fund it yet.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[var(--color-muted-2)] text-sm max-w-2xl">
          See the full{" "}
          <a
            href="https://github.com/CryptoBaba09/intern-project/blob/main/docs/inference-credits-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            design spec ↗
          </a>{" "}
          for what the staking-pool half still requires before it can ship.
        </Reveal>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto w-full flex flex-col lg:flex-row gap-10 items-start">
        {live ? (
          <PromptlyTopUp />
        ) : (
          <div className="w-full max-w-md border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6 text-center">
            <p className="font-mono text-sm text-[var(--color-muted)]">$INTERN isn&apos;t live yet.</p>
          </div>
        )}
        <div className="flex-1">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest mb-4">
            WORKS WITH
          </p>
          <div className="flex flex-wrap gap-2">
            {MODELS.map((m) => (
              <span
                key={m}
                className="font-mono text-xs text-[var(--color-fg)] border border-[var(--color-line)] rounded-full px-3 py-1.5"
              >
                {m}
              </span>
            ))}
          </div>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed mt-6 max-w-md">
            The key you get is a plain OpenRouter API key with a spend cap — whatever already
            works with OpenRouter works unchanged, no proprietary SDK.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 border-t border-[var(--color-line)] max-w-5xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          HOW THE STAKING POOL WOULD WORK
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-2">
          Fees in, inference out.
        </Reveal>
        <Reveal as="p" delay={0.08} className="text-[var(--color-muted)] text-sm mb-10 max-w-xl">
          Not live yet — this is the plan for the treasury-funded half, separate from the
          direct top-up above.
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6"
        >
          {[
            {
              n: "01",
              title: "Fees fund the pool",
              body: "A portion of protocol treasury revenue converts to real OpenRouter credit at face value — $1 of fees becomes $1 of inference.",
            },
            {
              n: "02",
              title: "Split by your stake",
              body: "Credit is split pro-rata by time-weighted staked $INTERN, reusing the same balances already earning you BE.",
            },
            {
              n: "03",
              title: "$INTERN burns to match",
              body: "Every dollar converted to credit also buys and burns an equal dollar of $INTERN — a second burn trigger alongside the deploy fee.",
            },
          ].map((step) => (
            <motion.div key={step.n} variants={fadeUp} className="border border-[var(--color-line)] p-6">
              <p className="font-mono text-xs text-[var(--color-muted-2)] mb-4">{step.n}</p>
              <h3 className="text-lg font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-10 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest mb-3">
            ONE HALF LIVE, ONE HALF PLANNED
          </p>
          <p className="text-[var(--color-fg)] text-lg mb-6 max-w-xl mx-auto">
            The staking pool ships after core staking is generating real fee revenue. Follow the{" "}
            <Link href="/roadmap" className="text-[var(--color-accent)] hover:underline">
              roadmap
            </Link>{" "}
            for real status.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/stake"
              className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              GO TO STAKING →
            </Link>
            <Link
              href="/marketplace"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              MEET THE OTHER INTERNS →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
