require("@nomicfoundation/hardhat-toolbox");

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
    // Point at Robinhood Chain once you're ready to test against a fork of
    // real deployed BE / $INTERN contracts instead of mocks:
    //   npx hardhat node --fork https://rpc.mainnet.chain.robinhood.com
    // then run tests/scripts with --network localhost.
  },
};
