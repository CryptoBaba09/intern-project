"use client";

// Shared swap logic for $interndex -- extracted so the same real wallet
// flow (quote, fee-cut burn, approval, swap) can back two different UIs:
// the full page (InterndexView.js) and the compact widget embedded on
// the homepage/trade page (components/InterndexWidget.js). Nothing here
// is presentational -- every consumer renders its own markup against
// the same state/handlers, so there's exactly one place the real
// on-chain logic can drift from what either UI shows.
//
// Genuinely any-chain-to-any-chain, any-token-to-any-token now (2026-
// 09-19) -- TO isn't pinned to Robinhood Chain anymore, and both sides'
// token lists come live from LI.FI's own catalog (lib/lifiCatalog.js),
// not a hardcoded handful. INTERNDEX_CHAINS/INTERNDEX_TOKENS in
// lib/chain.js are still real, but now just PINNED DEFAULTS merged to
// the top of each chain's live list, not the exclusive picker source.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useSendTransaction,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { CONTRACTS, DEAD_ADDRESS, INTERNDEX_FEE_BPS, INTERNDEX_CHAINS, INTERNDEX_TOKENS } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";
import { fetchInterndexQuote, NATIVE_ETH_SENTINEL } from "../lib/lifi";
import { fetchLifiChains, fetchLifiTokens } from "../lib/lifiCatalog";

export const ROBINHOOD_CHAIN_ID = INTERNDEX_CHAINS[0].id;

export function isNativeToken(address) {
  return address.toLowerCase() === NATIVE_ETH_SENTINEL.toLowerCase();
}

export function formatToken(value, decimals = 18, maxFractionDigits = 6) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

function sameToken(a, b) {
  return Boolean(a && b && a.address.toLowerCase() === b.address.toLowerCase());
}

// Pinned tokens for a chain (empty array for anything not in
// INTERNDEX_CHAINS), and pinned+live merged with pinned first, deduped
// by address -- so e.g. Robinhood Chain's search always surfaces
// $INTERN/ETH/USDG/the stock tokens up top, same idea as $INTERN
// itself being "pinned" in spirit even though the underlying list is
// now live.
function pinnedTokensFor(chainId) {
  return INTERNDEX_CHAINS.find((c) => c.id === chainId)?.tokens || [];
}
function mergeTokens(chainId, liveList) {
  const pinned = pinnedTokensFor(chainId);
  const pinnedAddrs = new Set(pinned.map((t) => t.address.toLowerCase()));
  const rest = liveList.filter((t) => !pinnedAddrs.has(t.address.toLowerCase()));
  return [...pinned, ...rest];
}
function defaultTokenFor(chainId, mergedList) {
  const pinned = pinnedTokensFor(chainId);
  if (pinned.length) return pinned[0];
  return mergedList.find((t) => isNativeToken(t.address)) || mergedList[0] || null;
}

export function useInterndexSwap() {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  // Live chain catalog -- starts with just the pinned defaults so the
  // pickers aren't empty before the real fetch resolves.
  const [chains, setChains] = useState(() => INTERNDEX_CHAINS.map(({ id, name }) => ({ id, name })));
  useEffect(() => {
    let cancelled = false;
    fetchLifiChains()
      .then((live) => {
        if (cancelled) return;
        const pinnedIds = new Set(INTERNDEX_CHAINS.map((c) => c.id));
        const pinned = INTERNDEX_CHAINS.map(({ id, name }) => ({ id, name }));
        const rest = live.filter((c) => !pinnedIds.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
        setChains([...pinned, ...rest]);
      })
      .catch(() => {}); // keep the pinned defaults on failure -- still a usable picker
    return () => {
      cancelled = true;
    };
  }, []);

  const [fromChainId, setFromChainId] = useState(ROBINHOOD_CHAIN_ID);
  const [toChainId, setToChainId] = useState(ROBINHOOD_CHAIN_ID);
  const [fromToken, setFromToken] = useState(INTERNDEX_TOKENS[0]); // $INTERN
  const [toToken, setToToken] = useState(INTERNDEX_TOKENS[1]); // ETH

  const [fromTokens, setFromTokens] = useState(() => pinnedTokensFor(ROBINHOOD_CHAIN_ID));
  const [toTokens, setToTokens] = useState(() => pinnedTokensFor(ROBINHOOD_CHAIN_ID));
  const [fromTokensLoading, setFromTokensLoading] = useState(false);
  const [toTokensLoading, setToTokensLoading] = useState(false);

  // Refetches (and re-merges with pinned defaults) whenever the FROM
  // chain changes. Resets the selected FROM token only if it's no
  // longer valid on the new chain -- e.g. leaving Robinhood Chain
  // drops $INTERN (it doesn't exist elsewhere), but native ETH staying
  // selected across two EVM chains that both have it is fine, not a
  // bug.
  useEffect(() => {
    let cancelled = false;
    setFromTokensLoading(true);
    fetchLifiTokens(fromChainId)
      .then((live) => {
        if (cancelled) return;
        const merged = mergeTokens(fromChainId, live);
        setFromTokens(merged);
        setFromToken((cur) =>
          merged.some((t) => sameToken(t, cur)) ? cur : defaultTokenFor(fromChainId, merged) || cur
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFromTokensLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromChainId]);

  useEffect(() => {
    let cancelled = false;
    setToTokensLoading(true);
    fetchLifiTokens(toChainId)
      .then((live) => {
        if (cancelled) return;
        const merged = mergeTokens(toChainId, live);
        setToTokens(merged);
        setToToken((cur) =>
          merged.some((t) => sameToken(t, cur)) ? cur : defaultTokenFor(toChainId, merged) || cur
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setToTokensLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toChainId]);

  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const [flowStep, setFlowStep] = useState("idle"); // idle | switching | approving | burning | swapping | done
  const [flowError, setFlowError] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);

  const isFromNative = isNativeToken(fromToken.address);
  const isFromIntern =
    fromChainId === ROBINHOOD_CHAIN_ID && fromToken.address.toLowerCase() === CONTRACTS.internToken.toLowerCase();
  const isCrossChain = fromChainId !== toChainId;
  const isNoopSwap = fromChainId === toChainId && sameToken(fromToken, toToken);

  function selectFromChain(chainId) {
    setFlowError(null);
    setFromChainId(chainId);
  }
  function selectToChain(chainId) {
    setFlowError(null);
    setToChainId(chainId);
  }
  function selectFrom(token) {
    setFlowError(null);
    if (fromChainId === toChainId && sameToken(token, toToken)) setToToken(fromToken);
    setFromToken(token);
  }
  function selectTo(token) {
    setFlowError(null);
    if (fromChainId === toChainId && sameToken(token, fromToken)) setFromToken(toToken);
    setToToken(token);
  }
  // Swaps both sides at once -- chain and token -- which is always a
  // valid swap now that TO isn't pinned to Robinhood Chain: FROM
  // Ethereum USDC / TO Robinhood $INTERN flips cleanly into FROM
  // Robinhood $INTERN / TO Ethereum USDC.
  function flip() {
    setFlowError(null);
    const prevFromChain = fromChainId;
    const prevToChain = toChainId;
    const prevFromToken = fromToken;
    const prevToToken = toToken;
    setFromChainId(prevToChain);
    setToChainId(prevFromChain);
    setFromToken(prevToToken);
    setToToken(prevFromToken);
  }

  const { data: fromDecimalsData } = useReadContract({
    address: isFromNative ? undefined : fromToken.address,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: fromChainId,
    query: { enabled: !isFromNative },
  });
  const fromDecimals = isFromNative ? 18 : fromDecimalsData ?? 18;

  const parsedAmount = useMemo(() => {
    try {
      return amount ? parseUnits(amount, fromDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, fromDecimals]);

  // Real buy pressure needs the fee to be collected in a currency
  // that ISN'T $INTERN at the moment it converts -- burning $INTERN
  // that's already $INTERN doesn't buy anything. So:
  //   - Selling $INTERN (isFromIntern): no pre-swap cut. The FULL
  //     amount swaps to the other token, and the fee is taken AFTER,
  //     as 0.2% of what you just received (toFeeAmount below) -- that
  //     cut buys $INTERN back on the open market and burns it, a real
  //     buy order, not just supply you were already selling anyway.
  //   - Everything else (buying $INTERN, or swapping between two
  //     other tokens/chains): the fee-cut is already in a non-$INTERN
  //     currency, so it's taken up front and bought back same as
  //     always.
  const feeAmount = isFromIntern ? 0n : (parsedAmount * INTERNDEX_FEE_BPS) / 10_000n;
  const swapAmount = parsedAmount - feeAmount;

  const { data: erc20Balance } = useReadContract({
    address: isFromNative ? undefined : fromToken.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: fromChainId,
    query: { enabled: Boolean(address) && !isFromNative, refetchInterval: 8000 },
  });
  const { data: nativeBalance } = useBalance({
    address,
    chainId: fromChainId,
    query: { enabled: Boolean(address) && isFromNative, refetchInterval: 8000 },
  });
  const balance = isFromNative ? nativeBalance?.value : erc20Balance;

  // Debounced live quote for the MAIN swap (the post-fee remainder,
  // delivered to the user's own wallet) -- FROM and TO chain/token are
  // both whatever's picked above now, not a fixed TO side. The fee-
  // buyback quote (when needed) is fetched fresh at swap time instead,
  // since it's a mechanical backend step, not something shown live.
  const quoteRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++quoteRequestId.current;
    setQuote(null);
    setQuoteError(null);
    if (!swapAmount || isNoopSwap) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const data = await fetchInterndexQuote({
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: swapAmount.toString(),
          fromAddress: address || DEAD_ADDRESS,
          fromChainId,
          toChainId,
        });
        if (quoteRequestId.current === requestId) setQuote(data);
      } catch (err) {
        if (quoteRequestId.current === requestId) {
          setQuoteError(err.message || "Couldn't get a live quote for that amount.");
        }
      } finally {
        if (quoteRequestId.current === requestId) setQuoting(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [swapAmount, fromToken.address, toToken.address, fromChainId, toChainId, isNoopSwap, address]);

  // Only meaningful when selling $INTERN (see feeAmount above), AND
  // only when the proceeds land back on Robinhood Chain -- if TO is a
  // different chain, the bridge's destination-side delivery is
  // asynchronous (this source-chain receipt confirms the outbound tx
  // landed, not that funds have actually arrived on the other side
  // yet), so attempting the buyback-burn right after would very
  // plausibly try to spend money that hasn't arrived. Rather than ship
  // a buyback that silently fails most of the time on that path, this
  // just doesn't collect the fee there for now -- no fee charged
  // beats a fee promised and not delivered. Same-chain sells (the
  // common case, e.g. $INTERN -> ETH both on Robinhood Chain) still
  // get the real buyback-burn. 0.2% of the guaranteed-minimum output,
  // so it never tries to pull more than what's actually guaranteed to
  // arrive.
  const toFeeAmount = useMemo(() => {
    if (!isFromIntern || toChainId !== ROBINHOOD_CHAIN_ID || !quote?.estimate?.toAmountMin) return 0n;
    try {
      return (BigInt(quote.estimate.toAmountMin) * INTERNDEX_FEE_BPS) / 10_000n;
    } catch {
      return 0n;
    }
  }, [isFromIntern, toChainId, quote]);

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  async function ensureOnChain(chainId) {
    if (walletChainId !== chainId) {
      setFlowStep("switching");
      await switchChainAsync({ chainId });
    }
  }

  // chainId/tokenAddress are both explicit now (not implicitly
  // fromChainId/fromToken) -- the post-swap buyback-burn leg (selling
  // $INTERN cross-chain) needs to approve/spend on whatever chain the
  // swap's OUTPUT landed on, which isn't necessarily fromChainId.
  async function ensureApproval(chainId, tokenAddress, spender, requiredAmount) {
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, spender],
      chainId,
    });
    if (allowance < requiredAmount) {
      setFlowStep("approving");
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
        chainId,
      });
      await publicClient.waitForTransactionReceipt({ hash, chainId });
    }
  }

  async function sendRawTx(chainId, transactionRequest) {
    const hash = await sendTransactionAsync({
      to: transactionRequest.to,
      data: transactionRequest.data,
      value: transactionRequest.value ? BigInt(transactionRequest.value) : undefined,
      chainId,
    });
    await publicClient.waitForTransactionReceipt({ hash, chainId });
    return hash;
  }

  async function handleSwap() {
    if (!quote?.transactionRequest || !address) return;
    setFlowError(null);
    setLastTxHash(null);
    try {
      await ensureOnChain(fromChainId);

      // Buying $INTERN, or swapping between two other tokens/chains:
      // fee-cut is already a non-$INTERN currency, so take it up
      // front and buy back + burn before the main swap, same as
      // always.
      if (!isFromIntern && feeAmount > 0n) {
        const feeQuote = await fetchInterndexQuote({
          fromToken: fromToken.address,
          toToken: CONTRACTS.internToken,
          fromAmount: feeAmount.toString(),
          fromAddress: address,
          toAddress: DEAD_ADDRESS,
          fromChainId,
          toChainId: ROBINHOOD_CHAIN_ID,
        });
        if (!isFromNative) {
          await ensureApproval(fromChainId, fromToken.address, feeQuote.estimate.approvalAddress, feeAmount);
        }
        setFlowStep("burning");
        await sendRawTx(fromChainId, feeQuote.transactionRequest);
      }

      if (!isFromNative) {
        await ensureApproval(fromChainId, fromToken.address, quote.estimate.approvalAddress, swapAmount);
      }
      setFlowStep("swapping");
      const hash = await sendRawTx(fromChainId, quote.transactionRequest);
      setLastTxHash(hash);
      setFlowStep("done");

      // Selling $INTERN: the main swap just went through in full (no
      // pre-cut) -- now buy back + burn using 0.2% of what came back,
      // wherever it landed (toChainId, not necessarily Robinhood
      // Chain anymore). A real market buy instead of just burning
      // $INTERN that was leaving anyway. Wrapped in its own try/catch:
      // the user already has their swapped funds at this point, so a
      // failed buyback leg (e.g. a dust-sized fee with no viable
      // route) is a soft note, not a failed swap.
      if (isFromIntern && toFeeAmount > 0n) {
        try {
          await ensureOnChain(toChainId);
          const feeQuote = await fetchInterndexQuote({
            fromToken: toToken.address,
            toToken: CONTRACTS.internToken,
            fromAmount: toFeeAmount.toString(),
            fromAddress: address,
            toAddress: DEAD_ADDRESS,
            fromChainId: toChainId,
            toChainId: ROBINHOOD_CHAIN_ID,
          });
          if (!isNativeToken(toToken.address)) {
            await ensureApproval(toChainId, toToken.address, feeQuote.estimate.approvalAddress, toFeeAmount);
          }
          setFlowStep("burning");
          await sendRawTx(toChainId, feeQuote.transactionRequest);
          setFlowStep("done");
        } catch (buybackErr) {
          setFlowStep("done");
          setFlowError(
            `Swap went through — the buyback-burn on the fee didn't (${buybackErr.shortMessage || buybackErr.message || "unknown error"}). No funds were lost, the fee just wasn't burned this time.`
          );
        }
      }
    } catch (err) {
      setFlowError(err.shortMessage || err.message || "Something went wrong.");
      setFlowStep("idle");
    }
  }

  const busy = ["switching", "approving", "burning", "swapping"].includes(flowStep);
  const fromChain = chains.find((c) => c.id === fromChainId) || { id: fromChainId, name: `Chain ${fromChainId}` };
  const toChain = chains.find((c) => c.id === toChainId) || { id: toChainId, name: `Chain ${toChainId}` };
  const buttonLabel =
    flowStep === "switching"
      ? "SWITCH CHAIN IN WALLET…"
      : flowStep === "approving"
        ? "APPROVE IN WALLET…"
        : flowStep === "burning"
          ? "BURNING FEE…"
          : flowStep === "swapping"
            ? "CONFIRM SWAP IN WALLET…"
            : "SWAP";

  return {
    isConnected,
    chains,
    fromChainId,
    toChainId,
    fromChain,
    toChain,
    fromToken,
    toToken,
    fromTokens,
    toTokens,
    fromTokensLoading,
    toTokensLoading,
    amount,
    setAmount,
    quote,
    quoting,
    quoteError,
    flowStep,
    flowError,
    lastTxHash,
    isFromNative,
    isFromIntern,
    isCrossChain,
    isNoopSwap,
    fromDecimals,
    parsedAmount,
    feeAmount,
    toFeeAmount,
    swapAmount,
    balance,
    busy,
    buttonLabel,
    selectFromChain,
    selectToChain,
    selectFrom,
    selectTo,
    flip,
    handleSwap,
  };
}
