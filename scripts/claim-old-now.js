const { ethers } = require("hardhat");

async function main() {
  const OLD_SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const [signer] = await ethers.getSigners();
  console.log("钱包:", signer.address);

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(OLD_SCROLL);

  const tokenId = await scroll.scrollOf(signer.address);
  console.log("tokenId:", tokenId.toString());

  const reward = await scroll.pendingReward(signer.address);
  console.log("待领取分红:", ethers.formatEther(reward), "BNB");

  if (reward > 0n) {
    console.log("领取分红...");
    const tx = await scroll.claim();
    console.log("Tx:", tx.hash);
    await tx.wait();
    console.log("✅ 领取成功!");
  }

  const bal = await ethers.provider.getBalance(OLD_SCROLL);
  console.log("旧 Scroll 剩余:", ethers.formatEther(bal), "BNB");
}

main().catch(console.error);
