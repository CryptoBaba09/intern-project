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
    hardhat: {},
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
