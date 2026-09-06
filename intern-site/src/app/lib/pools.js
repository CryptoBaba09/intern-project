import { getAddress } from "viem";

// $INTERN's two real, permanently-locked launch pools -- values sourced
// directly from PAIR's public API (pair.fund/api/tokens/0x692f...) right
// after the real launch (2026-09-06), cross-checked against the verified
// PairV5MultiPoolAggregator/V4Quoter ABIs pulled from Blockscout. These
// pools can never change (locked liquidity in PairV4Locker, fixed
// hook/fee/tickSpacing forever), so hardcoding here avoids a runtime
// dependency on PAIR's API just to quote or trade.
const INTERN = getAddress("0x692f212e73aef5c81ee74e46867ffb139eb25555");
const USDG = getAddress("0x5fc5360d0400a0fd4f2af552add042d716f1d168");
const BE = getAddress("0x822cc93ffd030293e9842c30bbd678f530701867");
const HOOK = getAddress("0xd2f759a1cf13c30127c551c3aee04629aea200c0");
const FEE = 10000;
const TICK_SPACING = 200;

function buildPool(quoteAddress, quoteSymbol, quoteDecimals, likelyPoolIndex) {
  const internIsCurrency0 = INTERN.toLowerCase() < quoteAddress.toLowerCase();
  const poolKey = internIsCurrency0
    ? { currency0: INTERN, currency1: quoteAddress, fee: FEE, tickSpacing: TICK_SPACING, hooks: HOOK }
    : { currency0: quoteAddress, currency1: INTERN, fee: FEE, tickSpacing: TICK_SPACING, hooks: HOOK };

  return {
    quoteAddress,
    quoteSymbol,
    quoteDecimals,
    poolKey,
    // A buy spends the quote token and receives $INTERN. That's a
    // currency0 -> currency1 swap exactly when the quote token IS
    // currency0 (i.e. $INTERN is NOT currency0). Sell is the reverse.
    buyZeroForOne: !internIsCurrency0,
    sellZeroForOne: internIsCurrency0,
    // PairV5MultiPoolAggregator verifies each leg's poolKey against the
    // launchpad's own registered index for this token -- this is our best
    // guess at that index from real launch order (this pool's position in
    // pair.fund's API pairs[] array). It's only ever used as a starting
    // guess: the trade widget always simulates buyExactInput/sellExactInput
    // for real before asking a wallet to sign, so a wrong guess here just
    // fails a free eth_call, never a paid transaction.
    likelyPoolIndex,
  };
}

export const POOLS = {
  USDG: buildPool(USDG, "USDG", 6, 0),
  BE: buildPool(BE, "BE", 18, 1),
};

export const INTERN_ADDRESS = INTERN;

// Every distinct poolIndex worth trying when probing via simulation,
// guessed pool first.
export function poolIndexCandidates(pool) {
  const all = [0, 1, 2, 3, 4];
  return [pool.likelyPoolIndex, ...all.filter((i) => i !== pool.likelyPoolIndex)];
}
