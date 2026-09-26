// Live burn card: node branding/burn-card.js -> branding/x-card-burn-24h.png
// Reads the dead-address balance and the last 24h of burns from the chain.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const { ethers } = require(path.join(__dirname, "../contracts/node_modules/ethers"));
const p = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com");
const T = "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8", DEAD = "0x000000000000000000000000000000000000dEaD";
const f = (x) => Math.round(Number(ethers.formatEther(x)));
(async () => {
  const latest = await p.getBlockNumber();
  let lo = 0, hi = latest; const target = Math.floor(Date.now() / 1000) - 86400;
  while (lo < hi) { const m = (lo + hi) >> 1; if ((await p.getBlock(m)).timestamp < target) lo = m + 1; else hi = m; }
  const erc = new ethers.Contract(T, ["function balanceOf(address) view returns(uint256)"], p);
  const total = f(await erc.balanceOf(DEAD));
  const logs = await p.getLogs({ address: T, topics: [ethers.id("Transfer(address,address,uint256)"), null, ethers.zeroPadValue(DEAD, 32)], fromBlock: lo, toBlock: latest });
  const day = logs.reduce((a, l) => a + BigInt(l.data), 0n);
  const n = (x) => x.toLocaleString("en-US");
  let h = fs.readFileSync(path.join(__dirname, "x-card-burn-24h.html"), "utf8");
  h = h.replace(/>[\d,]+<\/div>\n  <svg|>[\d,]{7,}</, (m) => m); // keep structure
  h = h.replace(/(<div class="num">)[\d,]+(<\/div>)/, `$1${n(f(day))}$2`)
       .replace(/[\d,]+ total · <em>[\d.]+% of supply\.<\/em>/, `${n(total)} total · <em>${(total / 1e7).toFixed(2)}% of supply.</em>`);
  const out = path.join(__dirname, "x-card-burn-24h");
  fs.writeFileSync(out + ".html", h);
  execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1080", "--virtual-time-budget=8000", `--screenshot=${out}.png`, `file://${out}.html`], { stdio: "ignore" });
  console.log(JSON.stringify({ burned24h: n(f(day)), burns: logs.length, totalBurned: n(total), pctSupply: (total / 1e7).toFixed(2) }));
})().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
