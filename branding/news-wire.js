// Tokenization news wire card. Edit branding/news-wire.json (3 verified items),
// then:  node branding/news-wire.js  ->  branding/x-card-news-wire.png (1200x675)
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const d = JSON.parse(fs.readFileSync(path.join(__dirname, "news-wire.json"), "utf8"));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rows = d.items.map((it, i) => `<div class="row"><div class="num">${i + 1}</div><div class="body"><div class="meta"><span class="tg">${esc(it.tag)}</span><span class="src">${esc(it.source)}</span></div><div class="hd">${esc(it.headline)}</div><div class="kk">${esc(it.takeaway)}</div></div></div>`).join("");
const html = `<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}html,body{margin:0}.stage{width:1200px;height:675px;position:relative;overflow:hidden;background:#0B0C0B;background-image:radial-gradient(ellipse 700px 380px at 20% 0%,rgba(0,200,5,.12),transparent 70%);font-family:'Space Grotesk',Arial,sans-serif;color:#EDEEF0}
.mono{font-family:'JetBrains Mono',monospace;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.top{position:absolute;left:56px;right:56px;top:40px;display:flex;justify-content:space-between;align-items:center}
.top .a{color:#00C805;font-size:22px;display:flex;align-items:center;gap:12px}.dot{width:12px;height:12px;border-radius:50%;background:#00C805;box-shadow:0 0 14px #00C805}
.top .d{color:#9BA1A6;font-size:18px}
h1{position:absolute;left:56px;top:86px;margin:0;font-size:46px;letter-spacing:-1px}
.list{position:absolute;left:56px;right:56px;top:168px}
.row{display:flex;gap:22px;padding:18px 22px;margin-bottom:12px;border:1px solid #1B1D1B;background:#101210;border-radius:18px}
.num{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:34px;color:#D9A441;width:36px}
.meta{display:flex;gap:14px;align-items:center;font-family:'JetBrains Mono',monospace;font-weight:600;font-size:14px;letter-spacing:.12em;text-transform:uppercase}
.tg{color:#00C805}.src{color:#4A4F54}
.hd{font-size:31px;line-height:1.1;margin-top:8px;letter-spacing:-.5px}
.kk{font-size:19px;color:#9BA1A6;margin-top:7px;line-height:1.25;font-family:'Space Grotesk',Arial,sans-serif;font-weight:500}
.tie{position:absolute;left:56px;right:56px;bottom:30px;display:flex;justify-content:space-between;font-size:17px}
.tie .l{color:#D9A441}.tie .r2{color:#4A4F54}
</style><div class="stage">
<div class="top mono"><span class="a"><i class="dot"></i>Tokenization wire</span><span class="d">${esc(d.date)}</span></div>
<h1>Three things moving tokenized stocks today</h1>
<div class="list">${rows}</div>
<div class="tie mono"><span class="l">${esc(d.tie)}</span><span class="r2">internburn.xyz</span></div>
</div>`;
const out = path.join(__dirname, "x-card-news-wire");
fs.writeFileSync(out + ".html", html);
execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1200,675", "--virtual-time-budget=8000", `--screenshot=${out}.png`, `file://${out}.html`], { stdio: "ignore" });
console.log("wrote", out + ".png");
