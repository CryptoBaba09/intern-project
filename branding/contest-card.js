// Refreshable "contest so far" card for Trading Competition #2.
// Run:  node branding/contest-card.js   -> writes branding/contest-card.png
// Reads the launch curve's Buy/Sell events + $INTERN transfers straight from
// the chain, applies the fair-play rules from docs/competition-2-rules.md and
// renders a 1080x1080 card. Nothing here is hand-typed.
const path = require("path");
const { execFileSync } = require("child_process");
const fs = require("fs");
const { ethers } = require(path.join(__dirname, "../contracts/node_modules/ethers"));

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const TOKEN = "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8";
const CURVE = "0x68da86af39b8d5347264d588f1ec6e8f31860400";
const STAKING = "0xd73a24D7bd311E36151344E233a7e6C73369E558";
const DEAD = "0x000000000000000000000000000000000000dead";
const TEAM = new Set([
  "0x163c267e80f02e849fe2982affcfe0810347a3bf",
  "0xbf2670493e35a015505dc5dda82df2ff8d4fcefc",
  "0xf87769fc763f91f5b9299f1495c9652eec3e3de1",
]);
const START = Date.UTC(2026, 8, 26, 12, 0, 0) / 1000;
const END = Date.UTC(2026, 9, 3, 12, 0, 0) / 1000;
const BUY = "0xec36bf571f136799e8dc0b0b8bea4b04d8bd3d43de838aab0d5fc21d4cbfc455";
const SELL = "0x8113d738abdcb6b38357e9d53a54a7157861a09031b453651f0fe7fe151f59df";
const TRANSFER = ethers.id("Transfer(address,address,uint256)");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const p = new ethers.JsonRpcProvider(RPC);
const word = (d, i) => BigInt("0x" + d.slice(2 + 64 * i, 2 + 64 * (i + 1)));
const addr = (t) => ("0x" + t.slice(26)).toLowerCase();
const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
const num = (x) => Number(ethers.formatEther(x));

async function blockAt(ts) {
  let lo = 0, hi = await p.getBlockNumber();
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await p.getBlock(mid)).timestamp < ts) lo = mid + 1; else hi = mid;
  }
  return lo;
}
async function logs(address, fromBlock, toBlock) {
  let out = [];
  for (let s = fromBlock; s <= toBlock; s += 400000) {
    out = out.concat(await p.getLogs({ address, fromBlock: s, toBlock: Math.min(toBlock, s + 399999) }));
  }
  return out;
}
async function ethUsd() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    return (await r.json()).ethereum.usd;
  } catch { return 2687; }
}
function prizes(pool) {
  if (pool < 25) return [1];
  if (pool < 100) return [0.5, 0.3, 0.2];
  return [0.4, 0.25, 0.15, 0.1, 0.1];
}

(async () => {
  const now = Math.floor(Date.now() / 1000);
  const latest = await p.getBlockNumber();
  const from = await blockAt(START);
  const to = now > END ? await blockAt(END) : latest;
  const price = await ethUsd();

  const curveLogs = await logs(CURVE, from, to);
  const tokenLogs = await logs(TOKEN, from, to);

  const W = {};
  const g = (a) => (W[a] ||= { inEth: 0n, outEth: 0n });
  let volume = 0n;
  for (const l of curveLogs) {
    if (l.topics[0] === BUY) { const q = word(l.data, 0); volume += q; g(addr(l.topics[2])).inEth += q; }
    else if (l.topics[0] === SELL) { const q = word(l.data, 1); volume += q; g(addr(l.topics[1])).outEth += q; }
  }

  // Fair play: a wallet that sends or receives $INTERN to/from any address
  // other than the curve, staking, or the dead address is flagged as linked.
  const okPeer = new Set([CURVE, STAKING.toLowerCase(), DEAD, "0x0000000000000000000000000000000000000000"]);
  const flagged = new Set();
  for (const l of tokenLogs) {
    if (l.topics[0] !== TRANSFER) continue;
    const a = addr(l.topics[1]), b = addr(l.topics[2]);
    if (okPeer.has(a) || okPeer.has(b)) continue;
    flagged.add(a); flagged.add(b);
  }

  const staking = new ethers.Contract(STAKING, ["function balanceOf(address) view returns(uint256)"], p);
  const curveC = new ethers.Contract(CURVE, ["function getReserves() view returns(uint256,uint256)"], p);
  const [qr, tr] = await curveC.getReserves();
  const tokenEth = num(qr) / num(tr);

  const rows = [];
  for (const [a, x] of Object.entries(W)) {
    if (TEAM.has(a)) continue;
    const net = num(x.inEth - x.outEth);
    const gross = num(x.inEth + x.outEth);
    const netUsd = net * price;
    if (netUsd < 10) continue;
    const staked = num(await staking.balanceOf(a)) * tokenEth * price;
    const linked = flagged.has(a);
    const qualified = !linked && (staked >= 10 || gross * price >= 200);
    rows.push({ a, netUsd, grossUsd: gross * price, stakedUsd: staked, linked, qualified });
  }
  rows.sort((r, s) => s.netUsd - r.netUsd);

  const volUsd = num(volume) * price;
  const pool = 0.01 * volUsd + 20;
  const split = prizes(pool);
  const winners = rows.filter((r) => r.qualified).slice(0, split.length);
  const secs = Math.max(0, END - now);
  const left = secs > 86400 ? `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h left` : `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m left`;

  const list = rows.slice(0, 5).map((r, i) => {
    const wi = winners.indexOf(r);
    const prize = wi >= 0 ? `$${(pool * split[wi]).toFixed(2)}` : r.linked ? "linked" : "needs stake or $200 vol";
    return `<div class="row"><span class="rk">${i + 1}</span><span class="ad">${short(r.a)}</span><span class="nt">$${r.netUsd.toFixed(0)}</span><span class="pz ${wi >= 0 ? "y" : ""}">${prize}</span></div>`;
  }).join("");
  const board = rows.length ? list : `<div class="empty">No qualifying wallets yet.<br><b>Be the first on the board.</b></div>`;

  const html = `<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}html,body{margin:0}.s{width:1080px;height:1080px;position:relative;overflow:hidden;background:#0B0C0B;background-image:radial-gradient(ellipse 760px 520px at 50% 22%,rgba(0,200,5,.14),transparent 70%);font-family:'Space Grotesk',Arial,sans-serif;color:#EDEEF0}
.mono{font-family:'JetBrains Mono',monospace;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.a{position:absolute;left:72px;right:72px}.g{color:#00C805}.y{color:#D9A441}
.row{display:grid;grid-template-columns:50px 1fr 130px 300px;align-items:center;padding:16px 22px;border:1px solid #1B1D1B;background:#101210;border-radius:16px;margin-bottom:10px;font-family:'JetBrains Mono',monospace;font-weight:600;font-size:26px}
.rk{color:#4A4F54}.ad{color:#EDEEF0}.nt{color:#00C805;text-align:right}.pz{text-align:right;color:#9BA1A6;font-size:20px}.pz.y{color:#D9A441;font-size:26px}
.empty{padding:54px 20px;text-align:center;border:1px dashed #2a2d2a;border-radius:18px;font-size:34px;line-height:1.35;color:#9BA1A6}.empty b{color:#EDEEF0}
</style><div class="s">
<div class="a mono y" style="top:60px;font-size:24px">$INTERN competition #2 · live</div>
<div class="a mono" style="top:112px;font-size:22px;color:#9BA1A6">Prize pool (1% of volume + $20)</div>
<div class="a g" style="top:146px;font-size:190px;font-weight:700;letter-spacing:-6px;line-height:1">$${pool.toFixed(2)}</div>
<div class="a mono" style="top:380px;font-size:26px;color:#9BA1A6">Volume $${volUsd.toFixed(0)} · ${left} </div>
<div class="a mono" style="top:440px;font-size:22px;color:#4A4F54">Net buy · top wallets</div>
<div class="a" style="top:486px">${board}</div>
<div class="a mono" style="bottom:60px;font-size:22px;color:#4A4F54;display:flex;justify-content:space-between"><span>Ends Oct 3 · 12:00 UTC</span><span>internburn.xyz</span></div>
</div>`;
  const out = path.join(__dirname, "contest-card");
  fs.writeFileSync(out + ".html", html);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1080", "--virtual-time-budget=8000", `--screenshot=${out}.png`, `file://${out}.html`], { stdio: "ignore" });
  console.log(JSON.stringify({ ethUsd: price, volumeUsd: +volUsd.toFixed(2), poolUsd: +pool.toFixed(2), left, ranked: rows.slice(0, 5), winners: winners.map((w) => w.a) }, null, 1));
})().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
