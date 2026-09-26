// Graduation progress card: node branding/graduation-card.js -> branding/x-card-graduation.png
// raised = curve ETH balance; threshold from the Pons factory (4.2 ETH).
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const { ethers } = require(path.join(__dirname, "../contracts/node_modules/ethers"));
const p = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com");
const CURVE = "0x68da86af39b8d5347264d588f1ec6e8f31860400";
(async () => {
  const f = new ethers.Contract("0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e", ["function getLaunchedToken(address) view returns (tuple(address token,address curve,address deployer,address creatorFeeRecipient,address pairToken,uint256 graduationThreshold,uint24 poolFee,int24 tickSpacing,uint16 creatorTaxBps,bool buybackEnabled,uint8 phase,uint256 sweptQuote,uint256 sweptTokens,uint256 sweptAt,bool exists))"], p);
  const l = await f.getLaunchedToken("0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8");
  const thr = Number(ethers.formatEther(l.graduationThreshold));
  const raised = Number(ethers.formatEther(await p.getBalance(CURVE)));
  let usd = 2690; try { usd = (await (await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")).json()).ethereum.usd; } catch {}
  const pct = raised / thr * 100, left = thr - raised;
  const marks = [10, 25, 50, 100];
  const next = marks.find((m) => pct < m);
  const mk = marks.map((m) => `<div class="mk" style="left:${m}%"><i></i><span>${m}%</span></div>`).join("");
  const html = `<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}html,body{margin:0}.s{width:1080px;height:1080px;position:relative;overflow:hidden;background:#0B0C0B;background-image:radial-gradient(ellipse 760px 520px at 50% 30%,rgba(0,200,5,.14),transparent 70%);font-family:'Space Grotesk',Arial,sans-serif;color:#EDEEF0}
.mono{font-family:'JetBrains Mono',monospace;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.a{position:absolute;left:72px;right:72px}.g{color:#00C805}.y{color:#D9A441}
.bar{position:absolute;left:72px;right:72px;top:520px;height:44px;border-radius:22px;background:#151815;border:1.5px solid #2a2d2a}
.fill{height:100%;border-radius:22px;background:linear-gradient(90deg,#00C805,#3DFF4A);min-width:14px;box-shadow:0 0 30px rgba(0,200,5,.45)}
.mk{position:absolute;top:56px;transform:translateX(-50%);text-align:center;font-family:'JetBrains Mono',monospace;font-size:20px;color:#9BA1A6}.mk i{display:block;width:2px;height:16px;background:#4A4F54;margin:-70px auto 54px}
.mk:last-child{transform:translateX(-100%)}
</style><div class="s">
<div class="a mono y" style="top:64px;font-size:24px">$INTERN · road to graduation</div>
<div class="a g" style="top:130px;font-size:230px;font-weight:700;letter-spacing:-8px;line-height:1">${pct.toFixed(1)}%</div>
<div class="a" style="top:392px;font-size:46px;font-weight:700;letter-spacing:-.5px">${raised.toFixed(3)} <span style="color:#9BA1A6">of ${thr} ETH raised</span></div>
<div class="bar"><div class="fill" style="width:${Math.min(100, pct)}%"></div>${mk}</div>
<div class="a" style="top:690px;font-size:38px;font-weight:700;line-height:1.2">${left.toFixed(2)} ETH to go <span style="color:#9BA1A6">(~$${Math.round(left * usd / 100) * 100 >= 1000 ? (left * usd / 1000).toFixed(1) + "K" : Math.round(left * usd)})</span><br><span class="y">Next milestone: ${next}%</span></div>
<div class="a mono" style="top:860px;font-size:22px;color:#9BA1A6;line-height:1.7">Then: Uniswap v4 pool · liquidity locked forever · open to more screeners</div>
<div class="a mono" style="bottom:56px;font-size:22px;color:#4A4F54;display:flex;justify-content:space-between"><span>Read from the chain</span><span>internburn.xyz</span></div>
</div>`;
  const out = path.join(__dirname, "x-card-graduation");
  fs.writeFileSync(out + ".html", html);
  execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1080", "--virtual-time-budget=8000", `--screenshot=${out}.png`, `file://${out}.html`], { stdio: "ignore" });
  console.log(JSON.stringify({ raised, threshold: thr, pct: +pct.toFixed(2), leftEth: +left.toFixed(4), leftUsd: Math.round(left * usd), next }));
})().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
