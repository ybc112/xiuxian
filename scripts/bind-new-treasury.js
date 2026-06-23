const { ethers } = require("hardhat");

async function main() {
  const NEW_TREASURY = "0xF8DE4847C68378cb9D9d77C616aB755c17aCa11F";
  const SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const treasury = Treasury.attach(NEW_TREASURY);

  console.log("绑定 Scroll 到新 Treasury...");
  const tx = await treasury.setRewardVault(SCROLL);
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("✅ 绑定成功!");

  const vault = await treasury.rewardVault();
  console.log("rewardVault:", vault);
}

main().catch(console.error);
