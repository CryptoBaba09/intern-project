"use client";

// Shared swap logic for $interndex -- extracted so the same real wallet
// flow (quote, fee-cut burn, approval, swap) can back two different UIs:
// the full pill-picker page (InterndexView.js) and the compact dropdown
// widget embedded on the homepage/trade page (components/InterndexWidget.js).
// Nothing here is presentational -- every consumer renders its own markup
// against the same state/handlers, so there's exactly one place the real
// on-chain logic can drift from what either UI shows.
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

export function useInterndexSwap() {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [fromChainId, setFromChainId] = useState(ROBINHOOD_CHAIN_ID);
  const fromChain = INTERNDEX_CHAINS.find((c) => c.id === fromChainId);
  const [fromSymbol, setFromSymbol] = useState("INTERN");
  const [toSymbol, setToSymbol] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const [flowStep, setFlowStep] = useState("idle"); // idle | switching | approving | burning | swapping | done
  const [flowError, setFlowError] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);

  const fromToken = fromChain.tokens.find((t) => t.symbol === fromSymbol) || fromChain.tokens[0];
  const toToken = INTERNDEX_TOKENS.find((t) => t.symbol === toSymbol);
  const isFromNative = isNativeToken(fromToken.address);
  const isFromIntern =
    fromChainId === ROBINHOOD_CHAIN_ID && fromToken.address.toLowerCase() === CONTRACTS.internToken.toLowerCase();
  const isCrossChain = fromChainId !== ROBINHOOD_CHAIN_ID;

  function selectChain(chain) {
    setFlowError(null);
    setFromChainId(chain.id);
    // Token lists differ per chain -- reset FROM to that chain's first
    // token rather than risk carrying over a symbol that doesn't exist
    // there.
    setFromSymbol(chain.tokens[0].symbol);
  }
  function selectFrom(token) {
    setFlowError(null);
    setFromSymbol(token.symbol);
    if (fromChainId === ROBINHOOD_CHAIN_ID && token.symbol === toSymbol) setToSymbol(fromSymbol);
  }
  function selectTo(token) {
    setFlowError(null);
    setToSymbol(token.symbol);
    if (fromChainId === ROBINHOOD_CHAIN_ID && token.symbol === fromSymbol) setFromSymbol(toSymbol);
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
  //     as 1% of what you just received (toFeeAmount below) -- that
  //     cut buys $INTERN back on the open market and burns it, a real
  //     buy order, not just supply you were already selling anyway.
  //   - Everything else (buying $INTERN, or swapping between two
  //     other tokens): the fee-cut is already in a non-$INTERN
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
  // delivered to the user's own wallet). TO is always Robinhood Chain;
  // FROM chain/token follow whatever's picked above, cross-chain or
  // not. The fee-buyback quote (when needed) is fetched fresh at swap
  // time instead, since it's a mechanical backend step, not something
  // shown live in the UI.
  const quoteRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++quoteRequestId.current;
    setQuote(null);
    setQuoteError(null);
    if (!swapAmount || (fromChainId === ROBINHOOD_CHAIN_ID && fromSymbol === toSymbol)) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const data = await fetchInterndexQuote({
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: swapAmount.toString(),
          fromAddress: address || DEAD_ADDRESS,
          fromChainId,
          toChainId: ROBINHOOD_CHAIN_ID,
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
  }, [swapAmount, fromToken.address, toToken.address, fromChainId, fromSymbol, toSymbol, address]);

  // Only meaningful when selling $INTERN (see feeAmount above) --
  // 1% of the guaranteed-minimum output, so the post-swap buyback
  // never tries to pull more than what's actually guaranteed to
  // arrive.
  const toFeeAmount = useMemo(() => {
    if (!isFromIntern || !quote?.estimate?.toAmountMin) return 0n;
    try {
      return (BigInt(quote.estimate.toAmountMin) * INTERNDEX_FEE_BPS) / 10_000n;
    } catch {
      return 0n;
    }
  }, [isFromIntern, quote]);

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  async function ensureOnFromChain() {
    if (walletChainId !== fromChainId) {
      setFlowStep("switching");
      await switchChainAsync({ chainId: fromChainId });
    }
  }

  // tokenAddress is explicit (not always fromToken -- the post-swap
  // buyback-burn leg needs to approve toToken instead, since that's
  // what's being spent on that leg).
  async function ensureApproval(tokenAddress, spender, requiredAmount) {
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, spender],
      chainId: fromChainId,
    });
    if (allowance < requiredAmount) {
      setFlowStep("approving");
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
        chainId: fromChainId,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
  }

  async function sendRawTx(transactionRequest) {
    const hash = await sendTransactionAsync({
      to: transactionRequest.to,
      data: transactionRequest.data,
      value: transactionRequest.value ? BigInt(transactionRequest.value) : undefined,
      chainId: fromChainId,
    });
    await publicClient.waitForTransactionReceipt({ hash, chainId: fromChainId });
    return hash;
  }

  async function handleSwap() {
    if (!quote?.transactionRequest || !address) return;
    setFlowError(null);
    setLastTxHash(null);
    try {
      await ensureOnFromChain();

      // Buying $INTERN (or swapping between two other tokens): fee-cut
      // is already a non-$INTERN currency, so take it up front and buy
      // back + burn before the main swap, same as always.
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
          await ensureApproval(fromToken.address, feeQuote.estimate.approvalAddress, feeAmount);
        }
        setFlowStep("burning");
        await sendRawTx(feeQuote.transactionRequest);
      }

      if (!isFromNative) {
        await ensureApproval(fromToken.address, quote.estimate.approvalAddress, swapAmount);
      }
      setFlowStep("swapping");
      const hash = await sendRawTx(quote.transactionRequest);
      setLastTxHash(hash);
      setFlowStep("done");

      // Selling $INTERN: the main swap just went through in full (no
      // pre-cut) -- now buy back + burn using 1% of what came back, a
      // real market buy instead of just burning $INTERN that was
      // leaving anyway. Wrapped in its own try/catch: the user already
      // has their swapped funds at this point, so a failed buyback
      // leg (e.g. a dust-sized fee with no viable route) is a soft
      // note, not a failed swap.
      if (isFromIntern && toFeeAmount > 0n) {
        try {
          const feeQuote = await fetchInterndexQuote({
            fromToken: toToken.address,
            toToken: CONTRACTS.internToken,
            fromAmount: toFeeAmount.toString(),
            fromAddress: address,
            toAddress: DEAD_ADDRESS,
            fromChainId: ROBINHOOD_CHAIN_ID,
            toChainId: ROBINHOOD_CHAIN_ID,
          });
          if (!isNativeToken(toToken.address)) {
            await ensureApproval(toToken.address, feeQuote.estimate.approvalAddress, toFeeAmount);
          }
          setFlowStep("burning");
          await sendRawTx(feeQuote.transactionRequest);
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
  const buttonLabel =
    flowStep === "switching"
      ? `SWITCH TO ${fromChain.name.toUpperCase()} IN WALLET…`
      : flowStep === "approving"
        ? "APPROVE IN WALLET…"
        : flowStep === "burning"
          ? "BURNING FEE…"
          : flowStep === "swapping"
            ? "CONFIRM SWAP IN WALLET…"
            : "SWAP";

  return {
    isConnected,
    fromChainId,
    fromChain,
    fromSymbol,
    toSymbol,
    amount,
    setAmount,
    quote,
    quoting,
    quoteError,
    flowStep,
    flowError,
    lastTxHash,
    fromToken,
    toToken,
    isFromNative,
    isFromIntern,
    isCrossChain,
    fromDecimals,
    parsedAmount,
    feeAmount,
    toFeeAmount,
    swapAmount,
    balance,
    busy,
    buttonLabel,
    selectChain,
    selectFrom,
    selectTo,
    handleSwap,
  };
}
