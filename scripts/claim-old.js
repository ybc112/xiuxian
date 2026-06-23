const { ethers } = require("hardhat");

async function main() {
  const OLD_SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(OLD_SCROLL);

  const [signer] = await ethers.getSigners();
  console.log("当前钱包:", signer.address);

  // 查谁有卷轴
  const tokenId = await scroll.scrollOf(signer.address);
  console.log("你的 tokenId:", tokenId.toString());

  if (tokenId > 0) {
    const reward = await scroll.pendingReward(signer.address);
    console.log("你的待领取分红:", ethers.formatEther(reward), "BNB");

    if (reward > 0n) {
      console.log("领取分红...");
      const tx = await scroll.claim();
      console.log("Tx:", tx.hash);
      await tx.wait();
      console.log("✅ 领取成功!");
    }
  } else {
    console.log("你在旧合约没有卷轴");
  }

  // 查剩余余额
  const bal = await ethers.provider.getBalance(OLD_SCROLL);
  console.log("旧 Scroll 剩余 BNB:", ethers.formatEther(bal));
}

main().catch(console.error);
