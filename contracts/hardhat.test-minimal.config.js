// Diagnostic-only config, not used by the real project (hardhat.config.js
// is). Requires only what the test suite actually needs instead of the
// full @nomicfoundation/hardhat-toolbox, which hangs indefinitely in
// this environment somewhere in its own require chain (isolated but not
// fully root-caused -- likely hardhat-verify or hardhat-ignition, given
// requiring hardhat-ethers + hardhat-chai-matchers alone runs fine).
// Delete this file once the real toolbox hang is understood/fixed, or
// keep it as a fast local test-only path -- either is fine, it changes
// nothing about what actually gets deployed (hardhat.config.js does).
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

module.exports = {
  mocha: { timeout: 120_000 },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
};
