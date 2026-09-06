require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      // Hardhat's forking simulator refuses to execute calls against a
      // forked historical block on a chain id it doesn't recognize --
      // Robinhood Chain (4663) isn't in its built-in registry, so it has
      // no idea which EVM hardfork rules to apply and errors with
      // "No known hardfork for execution on historical block ...".
      // Declaring cancun active since genesis (the latest stable
      // hardfork as of this project) tells it what ruleset to simulate;
      // this is a Hardhat-side simulation setting only, not a claim
      // about which hardfork Robinhood Chain's real Arbitrum Nitro nodes
      // actually run.
      chains: {
        4663: {
          hardforkHistory: {
            cancun: 0,
          },
        },
      },
    },
    // The real deployment target. Copy .env.example to .env here first and
    // fill in PRIVATE_KEY with the bot's operating wallet (same key as
    // intern-burn-bot/.env) -- that wallet needs to be OWNER_ADDRESS anyway
    // when running scripts/deploy.js, and needs a small amount of native
    // ETH for gas to actually send the deployment transaction.
    //   npx hardhat run scripts/deploy.js --network robinhoodChain
    robinhoodChain: {
      url: "https://rpc.mainnet.chain.robinhood.com",
      chainId: 4663,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // To dry-run the exact same deploy against a local fork of real,
    // already-deployed BE/$INTERN contracts without spending anything:
    //   npx hardhat node --fork https://rpc.mainnet.chain.robinhood.com
    // then run scripts/deploy.js --network localhost in another terminal.
  },
};
