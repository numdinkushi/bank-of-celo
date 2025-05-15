// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";


const MIN_BALANCE = parseEther("5");

const BocModule = buildModule("BocModule", (m) => {
  
    const minBalance = m.getParameter("_minVaultBalance", MIN_BALANCE);
    const devAddress = m.getParameter("_devWallet", "0xC5337CeE97fF5B190F26C4A12341dd210f26e17c");
    const gaslessOperator = m.getParameter("_gaslessOperator", "0xC32ecED3420f59e38b0F719AAC67b3C36c6A5d97");

  const BOC = m.contract("BankOfCelo", [minBalance,devAddress,gaslessOperator]);

  return { BOC };
});

export default BocModule;
