// scripts/bind-now.js
const { ethers } = require("hardhat");

async function main() {
  const TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  console.log("🔑 绑定中...");
  console.log("Treasury:", TREASURY);
  console.log("Scroll:", SCROLL);

  const [signer] = await ethers.getSigners();
  console.log("当前钱包:", signer.address);

  const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const treasury = Treasury.attach(TREASURY);

  const owner = await treasury.owner();
  console.log("Treasury owner:", owner);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("当前钱包不是 owner");
  }

  const current = await treasury.rewardVault();
  console.log("当前 rewardVault:", current);

  if (current.toLowerCase() === SCROLL.toLowerCase()) {
    console.log("✅ 已经绑定过了");
    return;
  }

  const tx = await treasury.setRewardVault(SCROLL);
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("✅ 绑定成功!");

  const newVault = await treasury.rewardVault();
  console.log("新 rewardVault:", newVault);
}

main().catch(console.error);
