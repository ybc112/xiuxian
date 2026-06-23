const { ethers } = require("hardhat");

async function main() {
  const OLD_TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const treasury = await ethers.getContractAt("CultivationTaxTreasury", OLD_TREASURY);

  console.log("旧 Treasury:", OLD_TREASURY);
  console.log("owner:", await treasury.owner());
  console.log("rewardVault:", await treasury.rewardVault());
  console.log("totalReceived:", ethers.formatEther(await treasury.totalReceived()));
  console.log("totalRouted:", ethers.formatEther(await treasury.totalRouted()));
  console.log("treasuryBalance:", ethers.formatEther(await treasury.treasuryBalance()));

  const bal = await ethers.provider.getBalance(OLD_TREASURY);
  console.log("BNB余额:", ethers.formatEther(bal));
}

main().catch(console.error);
