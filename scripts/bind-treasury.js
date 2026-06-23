const { ethers } = require("hardhat");

async function main() {
  const treasuryAddress = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const scrollAddress = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const Treasury = await ethers.getContractAt("CultivationTaxTreasury", treasuryAddress);
  const tx = await Treasury.setRewardVault(scrollAddress);
  const receipt = await tx.wait();

  console.log("Treasury:", treasuryAddress);
  console.log("Scroll (RewardVault):", scrollAddress);
  console.log("Tx:", receipt.hash);
  console.log("绑定成功!");
}

main().catch((error) => {
  console.error("绑定失败:", error.message);
  process.exitCode = 1;
});
