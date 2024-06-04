require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: "https://red-long-surf.avalanche-mainnet.quiknode.pro/2e859e5085125af0437a8aa1999be3f88cd6a90f/ext/bc/C/rpc/",
        //url: "https://powerful-proportionate-resonance.optimism.quiknode.pro/eeefe5958f6185947ff2ff4122c7fe2eb104cc26/",
        //url: "https://fittest-intensive-sunset.matic.quiknode.pro/41ac60c3157f9ed16232806b217886d540fdac1c/",
      },
    },
  },
};
