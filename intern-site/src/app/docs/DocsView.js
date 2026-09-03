"use client";

import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";

function SectionLabel({ children }) {
  return (
    <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
      {children}
    </Reveal>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="bg-[#0B0C0B] border border-[#1B1D1B] rounded-xl p-4 overflow-x-auto font-mono text-xs text-[#9BA1A6] leading-relaxed">
      {children}
    </pre>
  );
}

function InfoTable({ rows }) {
  return (
    <div className="border border-[#1B1D1B] border-collapse overflow-hidden overflow-x-auto">
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={`flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-6 px-6 py-4 font-mono text-sm ${
            i !== rows.length - 1 ? "border-b border-[#1B1D1B]" : ""
          }`}
        >
          <span className="text-[#9BA1A6] shrink-0">{label}</span>
          <span className="text-[#EDEEF0] sm:text-right break-all">{value}</span>
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
  ["$INTERN token", "Set at launch on PAIR — not live yet, see /roadmap"],
  ["BE (pairing asset)", "0x822cC93fFD030293E9842C30bBD678f530701867"],
  ["InternStakingRewards", "Deployed once $INTERN is live — see /stake"],
  ["PAIR Launchpad (V5)", "0x8660A7F019C7943b0b0A91B8E39AFf3b6DB6Ae62"],
  ["PairV4Locker (fee claims)", "0xeFcF476E8870fB3eb8680f039414fdcCE6C2a117"],
  ["PairV5MultiPoolAggregator (swaps)", "0x9d7741776098aFA315e4D576ede4F2c67a21d8Ce"],
  ["V4Quoter (price quotes)", "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94"],
  ["Dead / burn address", "0x000000000000000000000000000000000000dEaD"],
];

const TOKENOMICS_ROWS = [
  ["Total supply", "1,000,000,000 $INTERN, fixed at launch — PAIR's standard launch size, no supply customization"],
  ["Mint function", "None, ever"],
  ["Marketplace deploy fee", "10,000 $INTERN burned per intern deployed (0.001% of supply per deploy)"],
  ["Creator fee split", "70% buy-and-burn · 20% streamed to staked $INTERN · 10% treasury"],
  ["Swap fee", "PAIR's standard 1% pool fee only — no added creator trading tax"],
];

export default function DocsView() {
  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-4xl mx-auto w-full">
        <SectionLabel>DOCS</SectionLabel>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6">
          Everything, verifiable on-chain.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[#9BA1A6] text-lg leading-relaxed max-w-2xl">
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
        <Reveal as="p" delay={0.1} className="text-[#9BA1A6] text-sm leading-relaxed mb-6 max-w-2xl">
          PAIR's protocol contracts already exist on-chain — they're
          protocol-wide, not specific to $INTERN, so they're real today
          even before $INTERN itself launches. Only $INTERN's own token
          address and its staking contract wait on launch.
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
          <p className="font-mono text-xs text-[#4A4F54]">
            Full breakdown, including the live fee-split visual, on the{" "}
            <a href="/tokenomics" className="text-[#00C805] hover:underline">
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
        <Reveal as="p" delay={0.1} className="text-[#9BA1A6] text-sm leading-relaxed mb-6 max-w-2xl">
          Everything below reads straight off the contracts with{" "}
          <a
            href="https://viem.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00C805] hover:underline"
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
            <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-3">
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
            <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-3">
              CURRENT $INTERN SUPPLY (BURN-ADJUSTED)
            </p>
            <CodeBlock>{`const supplyAbi = parseAbi(["function totalSupply() view returns (uint256)"]);

const currentSupply = await client.readContract({
  address: INTERN_TOKEN_ADDRESS,
  abi: supplyAbi,
  functionName: "totalSupply",
});

// Standard ERC20 totalSupply() already reflects every burn to the dead
// address as a real transfer -- no separate "burned" tracker needed.
const burned = 1_000_000_000n * 10n ** 18n - currentSupply;`}</CodeBlock>
          </motion.div>
        </motion.div>
      </section>

      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <SectionLabel>VERIFY IT YOURSELF</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-6">
          Don't take our word for it
        </Reveal>
        <Reveal>
          <div className="grid sm:grid-cols-2 gap-px bg-[#1B1D1B] border border-[#1B1D1B]">
            <a
              href="https://robinhoodchain.blockscout.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0B0C0B] p-6 hover:bg-white/[0.03] transition-colors"
            >
              <h3 className="text-base font-medium mb-2">Block explorer ↗</h3>
              <p className="text-sm text-[#9BA1A6] leading-relaxed">
                Read every contract's verified source directly on
                Blockscout.
              </p>
            </a>
            <a
              href="https://github.com/CryptoBaba09/intern-project"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0B0C0B] p-6 hover:bg-white/[0.03] transition-colors"
            >
              <h3 className="text-base font-medium mb-2">Source code ↗</h3>
              <p className="text-sm text-[#9BA1A6] leading-relaxed">
                This entire project — contract, bot, and site — is public
                on GitHub.
              </p>
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <p className="font-mono text-[10px] text-[#4A4F54] leading-relaxed max-w-2xl">
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
