"use client";

import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";

function SectionLabel({ children }) {
  return (
    <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
      {children}
    </Reveal>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl p-4 overflow-x-auto font-mono text-xs text-[var(--color-muted)] leading-relaxed">
      {children}
    </pre>
  );
}

function InfoTable({ rows }) {
  return (
    <div className="border border-[var(--color-line)] border-collapse overflow-hidden overflow-x-auto">
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={`flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-6 px-6 py-4 font-mono text-sm ${
            i !== rows.length - 1 ? "border-b border-[var(--color-line)]" : ""
          }`}
        >
          <span className="text-[var(--color-muted)] shrink-0">{label}</span>
          <span className="text-[var(--color-fg)] sm:text-right break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

const NETWORK_ROWS = [
  ["Network", "Robinhood Chain"],
  ["Chain ID", "4663"],
  ["Native asset", "ETH"],
  ["Public RPC", "https://rpc.mainnet.chain.robinhood.com"],
  ["Explorer", "robinhoodchain.blockscout.com"],
];

const CONTRACT_ROWS = [
  ["$INTERN v2 token", "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8"],
  ["$INTERN v1 token (migrating off)", "0x692f212e73aef5c81ee74e46867ffb139eb25555"],
  ["InternMigration (v1 → v2, 1:1)", "0x3bADCd1DeE2c0213EBdA77c3D243826ABFbeFa89"],
  ["InternStakingRewards (v1, paired with old token)", "0xe7804319Ea528CfED8C7908A4197EdE0ae44895a"],
  ["InternStakingRewards (v2)", "Not deployed yet"],
  ["Dead / burn address", "0x000000000000000000000000000000000000dEaD"],
];

const TOKENOMICS_ROWS = [
  ["Total supply", "1,000,000,000 $INTERN, fixed at launch, no supply customization"],
  ["Mint function", "None, ever"],
  ["Marketplace deploy fee", "10,000 $INTERN burned per intern deployed (0.001% of supply per deploy)"],
  ["Creator fee split", "70% buy-and-burn · 20% streamed to staked $INTERN (or joins the burn if nobody's staked yet) · 10% treasury"],
  ["Swap fee", "2% total on Pons (1% base pool fee + 1% creator tax) — disclosed here, not hidden"],
];

export default function DocsView() {
  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-4xl mx-auto w-full">
        <SectionLabel>DOCS</SectionLabel>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6">
          Everything, verifiable on-chain.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl">
          $INTERN never asks you to trust a claim you can't check yourself.
          Every address below is a real, verified contract on Robinhood
          Chain — click through to Blockscout and read the source before
          you trust it with anything.
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <SectionLabel>NETWORK</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-6">
          Robinhood Chain
        </Reveal>
        <Reveal>
          <InfoTable rows={NETWORK_ROWS} />
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <SectionLabel>CONTRACTS</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-2">
          Deployed addresses
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed mb-6 max-w-2xl">
          $INTERN v2 is live on Pons, paired against ETH — migrated off
          v1/Pair.fund on 2026-09-10 after Pair.fund's trading route broke
          for days. Every address below is real; InternStakingRewards is
          listed as not-yet-deployed rather than pointed at a guess.
        </Reveal>
        <Reveal>
          <InfoTable rows={CONTRACT_ROWS} />
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <SectionLabel>TOKENOMICS</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-6">
          The numbers
        </Reveal>
        <Reveal>
          <InfoTable rows={TOKENOMICS_ROWS} />
        </Reveal>
        <Reveal delay={0.1} className="mt-4">
          <p className="font-mono text-xs text-[var(--color-muted-2)]">
            Full breakdown, including the live fee-split visual, on the{" "}
            <a href="/tokenomics" className="text-[var(--color-accent)] hover:underline">
              tokenomics page
            </a>
            .
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <SectionLabel>INTEGRATION</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-2">
          Reading state directly
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed mb-6 max-w-2xl">
          Everything below reads straight off the contracts with{" "}
          <a
            href="https://viem.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            viem
          </a>{" "}
          — no API, no indexer required for basic reads.
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="space-y-8"
        >
          <motion.div variants={fadeUp}>
            <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-3">
              A STAKER'S POSITION
            </p>
            <CodeBlock>{`import { createPublicClient, http, parseAbi } from "viem";

const client = createPublicClient({
  chain: {
    id: 4663,
    name: "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  },
  transport: http(),
});

const stakingAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function earned(address account) view returns (uint256)",
  "function totalStaked() view returns (uint256)",
]);

const [staked, earned, totalStaked] = await Promise.all([
  client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: "balanceOf", args: [wallet] }),
  client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: "earned", args: [wallet] }),
  client.readContract({ address: STAKING_ADDRESS, abi: stakingAbi, functionName: "totalStaked" }),
]);`}</CodeBlock>
          </motion.div>

          <motion.div variants={fadeUp}>
            <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-3">
              REAL CUMULATIVE BURNS (NOT totalSupply())
            </p>
            <CodeBlock>{`const balanceAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

// $INTERN's burn bot sends tokens to the dead address via a plain
// transfer(), not a real burn() call -- so totalSupply() NEVER changes
// and can't be used to measure burns. This address's own balance is
// the real, cumulative burn total. Verify it yourself on Blockscout.
const burned = await client.readContract({
  address: INTERN_TOKEN_ADDRESS,
  abi: balanceAbi,
  functionName: "balanceOf",
  args: [DEAD_ADDRESS],
});`}</CodeBlock>
          </motion.div>
        </motion.div>
      </section>

      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <SectionLabel>VERIFY IT YOURSELF</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-6">
          Don't take our word for it
        </Reveal>
        <Reveal>
          <div className="grid sm:grid-cols-2 gap-px bg-[var(--color-line)] border border-[var(--color-line)]">
            <a
              href="https://robinhoodchain.blockscout.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--color-bg)] p-6 hover:bg-white/[0.03] transition-colors"
            >
              <h3 className="text-base font-medium mb-2">Block explorer ↗</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                Read every contract's verified source directly on
                Blockscout.
              </p>
            </a>
            <a
              href="https://github.com/CryptoBaba09/intern-project"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--color-bg)] p-6 hover:bg-white/[0.03] transition-colors"
            >
              <h3 className="text-base font-medium mb-2">Source code ↗</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                This entire project — contract, bot, and site — is public
                on GitHub.
              </p>
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <p className="font-mono text-[10px] text-[var(--color-muted-2)] leading-relaxed max-w-2xl">
            $INTERN is a fixed-supply utility token on Robinhood Chain.
            This page is informational only and is not investment,
            financial, or legal advice. Staking involves smart contract
            risk — InternStakingRewards has been reviewed internally but
            has not had a professional third-party audit. Always verify
            contract addresses independently before interacting with them.
          </p>
        </Reveal>
      </section>
    </>
  );
}
