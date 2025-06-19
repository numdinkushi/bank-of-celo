// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CeloJackpotModule = buildModule("CeloCheckInModuleV2", (m) => {
  const trustee = m.getParameter(
    "_devWallet",
    "0xbE95bb47789E5f4Af467306C97DED0877BF817B5",
  );

  const BOC = m.contract("CeloJackpotV2", [trustee]);

  return { BOC };
});

export default CeloJackpotModule;
//deployed addy - 0x9602d02Bd17d9f1c1EB09028fCea26dD29383611
