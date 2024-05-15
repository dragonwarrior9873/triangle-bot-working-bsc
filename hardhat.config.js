require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-gas-reporter");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// const OP_Sepolia_Testnet_RPC_URL = process.env.OP_Sepolia_Testnet_RPC_URL;
// const OP_Mainnet_RPC_URL = process.env.OP_Mainnet_RPC_URL;

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.5.16',
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: '0.8.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.20',
      },
    ]
  },
  defaultNetwork: "Bsc",
  networks: {
    Bsc: {
      chainId: 56,
      url: "https://bsc-rpc.publicnode.com",
      accounts: [process.env.PRIVATE_KEY],
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  gasReporter: {
    enabled: true,
  },
  etherscan: {
    apiKey: {
      Bsc: "6I41MEM8Y9EQI6GWSCKAAQHEDRW2ASF9S8",
    },
    customChains: [
      {
        network: "Bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com/"
        }
      }
    ]
  },
};
