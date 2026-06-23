const { ethers } = require("hardhat");

async function main() {
  const SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const [signer] = await ethers.getSigners();
  console.log("调用者:", signer.address);

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(SCROLL);

  const owner = await scroll.owner();
  console.log("Scroll owner:", owner);

  const buybackReserve = await scroll.buybackLpReserve();
  console.log("回购储备:", ethers.formatEther(buybackReserve), "BNB");

  if (buybackReserve > 0n) {
    console.log("执行回购做市...");
    const deadline = Math.floor(Date.now() / 1000) + 600;
    try {
      const tx = await scroll.executeBuybackAndAddLiquidity(
        buybackReserve,
        0,
        0,
        0,
        deadline
      );
      console.log("Tx:", tx.hash);
      await tx.wait();
      console.log("✅ 回购做市完成!");
    } catch (e) {
      console.log("❌ 失败:", e.message.slice(0, 300));
    }
  }

  const newBuyback = await scroll.buybackLpReserve();
  console.log("剩余回购储备:", ethers.formatEther(newBuyback), "BNB");
}

main().catch(console.error);
