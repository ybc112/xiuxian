const { ethers } = require("hardhat");

async function main() {
  const OLD_TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const treasury = Treasury.attach(OLD_TREASURY);

  const bal = await ethers.provider.getBalance(OLD_TREASURY);
  console.log("旧 Treasury BNB:", ethers.formatEther(bal));

  if (bal > 0n) {
    console.log("路由到 Scroll...");
    const tx = await treasury.routeToRewardVault(0);
    console.log("Tx:", tx.hash);
    await tx.wait();
    console.log("✅ 路由完成!");
  }

  // 执行回购做市
  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(SCROLL);

  const buybackReserve = await scroll.buybackLpReserve();
  console.log("回购储备:", ethers.formatEther(buybackReserve));

  if (buybackReserve > 0n) {
    console.log("执行回购做市...");
    const deadline = Math.floor(Date.now() / 1000) + 600;
    try {
      const tx = await scroll.executeBuybackAndAddLiquidity(
        buybackReserve,
        0, // minTokensOut - 生产环境应设滑点保护
        0, // minLpTokens
        0, // minLiquidity
        deadline
      );
      console.log("Tx:", tx.hash);
      await tx.wait();
      console.log("✅ 回购做市完成!");
    } catch (e) {
      console.log("❌ 回购做市失败:", e.message.slice(0, 200));
    }
  }

  // 最终状态
  const newBuyback = await scroll.buybackLpReserve();
  const newDividend = await scroll.totalDividendReceived();
  console.log("\n最终状态:");
  console.log("  分红池:", ethers.formatEther(newDividend), "BNB");
  console.log("  回购储备:", ethers.formatEther(newBuyback), "BNB");
}

main().catch(console.error);
