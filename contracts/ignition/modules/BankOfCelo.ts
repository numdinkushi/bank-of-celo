// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";


const MIN_BALANCE = parseEther("5");

const BocModule = buildModule("BocModule", (m) => {
  
    const minBalance = m.getParameter("_minVaultBalance", MIN_BALANCE);

  const BOC = m.contract("BankOfCelo", [minBalance]);

  return { BOC };
});

export default BocModule;
