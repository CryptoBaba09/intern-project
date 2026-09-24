// Builds and signs the AuthBundle CacheBorrow's authorization-gated
// functions require (borrow/withdrawCollateral/withdrawSupply) -- see
// CacheBorrow.sol's own NatSpec and docs/cache-borrow-spec.md for the
// full "why" (real Morpho Blue requires msg.sender == onBehalf ||
// isAuthorized[onBehalf][msg.sender] for those three specifically;
// CacheBorrow's real caller is its own contract address, never the
// user's, so a grant is required every time -- but revoked in the
// same transaction it's used in, so no standing authority is ever
// created).
//
// Both signatures here are free, off-chain EIP-712 signs (wagmi's
// signTypedDataAsync) -- neither is a gas transaction, and neither
// touches the network beyond the one nonce read needed to build a
// valid, unreplayed Authorization. The wallet will prompt twice
// (grant, then revoke) before the actual on-chain call.
//
// DOMAIN IS NOT THE USUAL ERC-20-PERMIT SHAPE: Morpho Blue's real
// DOMAIN_SEPARATOR is keccak256(abi.encode(keccak256("EIP712Domain(uint256
// chainId,address verifyingContract)"), chainId, address(this))) --
// deliberately no `name`/`version`/`salt` fields. Confirmed 2026-09-24
// by reading the real deployed DOMAIN_SEPARATOR() off Morpho
// (0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010) and reproducing it
// byte-for-byte with exactly this domain shape -- passing `name`/
// `version` here (the usual EIP-712 convention) would silently change
// the domain typehash and produce signatures Morpho itself rejects.
const AUTHORIZATION_TYPES = {
  Authorization: [
    { name: "authorizer", type: "address" },
    { name: "authorized", type: "address" },
    { name: "isAuthorized", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

// 10 minutes -- long enough that a grant/revoke pair signed right
// before a transaction never expires mid-flow (wallet confirmation,
// network confirmation), short enough that a signature sitting
// unused somewhere isn't a standing risk.
const DEADLINE_WINDOW_SECONDS = 600n;

function splitSignature(sigHex) {
  const r = sigHex.slice(0, 66);
  const s = `0x${sigHex.slice(66, 130)}`;
  const v = parseInt(sigHex.slice(130, 132), 16);
  return { v, r, s };
}

// `signTypedDataAsync` is wagmi's useSignTypedData().signTypedDataAsync
// (or the async equivalent) -- called from inside a component/hook
// with a connected wallet, never here directly. `readNonce` is a
// function returning the authorizer's current Morpho nonce (a live
// read, not cached -- see MORPHO_ABI's own comment on why).
export async function signAuthBundle({ signTypedDataAsync, readNonce, chainId, morphoAddress, authorizer, authorizedContract }) {
  const domain = { chainId, verifyingContract: morphoAddress };
  const nonce = await readNonce();
  const deadline = BigInt(Math.floor(Date.now() / 1000)) + DEADLINE_WINDOW_SECONDS;

  const grant = {
    authorizer,
    authorized: authorizedContract,
    isAuthorized: true,
    nonce,
    deadline,
  };
  const grantSigHex = await signTypedDataAsync({
    domain,
    types: AUTHORIZATION_TYPES,
    primaryType: "Authorization",
    message: grant,
  });

  const revoke = {
    authorizer,
    authorized: authorizedContract,
    isAuthorized: false,
    nonce: nonce + 1n,
    deadline,
  };
  const revokeSigHex = await signTypedDataAsync({
    domain,
    types: AUTHORIZATION_TYPES,
    primaryType: "Authorization",
    message: revoke,
  });

  return {
    grant,
    grantSig: splitSignature(grantSigHex),
    revoke,
    revokeSig: splitSignature(revokeSigHex),
  };
}
