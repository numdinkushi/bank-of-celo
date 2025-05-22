import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import { config as dotEnvConfig } from "dotenv";

dotEnvConfig();
const config: HardhatUserConfig = {
  networks: {
    alfajores: {
      accounts: [process.env.PRIVATE_KEY ?? "0x0"],
      url: "https://alfajores-forno.celo-testnet.org",
    },
    celo: {
      accounts: [process.env.PRIVATE_KEY ?? "0x0"],
      url: "https://forno.celo.org",
    },
  },
  etherscan: {
    apiKey: {
      alfajores: process.env.CELOSCAN_API_KEY ?? "",
      celo: process.env.CELOSCAN_API_KEY ?? "",
    },
    customChains: [
      {
        chainId: 44_787,
        network: "alfajores",
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      {
        chainId: 42_220,
        network: "celo",
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io/",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  solidity: "0.8.24",
};

export default config;
