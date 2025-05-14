// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";


const MIN_BALANCE = parseEther("5");

const BocModule = buildModule("BocModule", (m) => {
  
    const minBalance = m.getParameter("_minVaultBalance", MIN_BALANCE);
    const devAddress = m.getParameter("_devWallet", "0xC5337CeE97fF5B190F26C4A12341dd210f26e17c");

  const BOC = m.contract("BankOfCelo", [minBalance,devAddress]);

  return { BOC };
});

export default BocModule;
