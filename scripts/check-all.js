const { ethers } = require("hardhat");

async function main() {
  const OLD_TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const NEW_TREASURY = "0xF8DE4847C68378cb9D9d77C616aB755c17aCa11F";
  const SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  // 旧 Treasury 余额
  const oldBal = await ethers.provider.getBalance(OLD_TREASURY);
  console.log("旧 Treasury BNB:", ethers.formatEther(oldBal));

  // 新 Treasury 余额
  const newBal = await ethers.provider.getBalance(NEW_TREASURY);
  console.log("新 Treasury BNB:", ethers.formatEther(newBal));

  // Scroll 状态
  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(SCROLL);

  const totalDividendReceived = await scroll.totalDividendReceived();
  console.log("Scroll totalDividendReceived (80%分红):", ethers.formatEther(totalDividendReceived));

  const buybackLpReserve = await scroll.buybackLpReserve();
  console.log("Scroll buybackLpReserve (20%回购):", ethers.formatEther(buybackLpReserve));

  const totalClaimed = await scroll.totalClaimed();
  console.log("Scroll totalClaimed (已领取):", ethers.formatEther(totalClaimed));

  const activeScrolls = await scroll.activeScrolls();
  console.log("Active Scrolls:", activeScrolls.toString());

  // 旧 Treasury 的 rewardVault 指向谁
  const OldTreasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const oldTreasury = OldTreasury.attach(OLD_TREASURY);
  const oldVault = await oldTreasury.rewardVault();
  console.log("\n旧 Treasury.rewardVault:", oldVault);

  // 新 Treasury
  const newTreasury = OldTreasury.attach(NEW_TREASURY);
  const newVault = await newTreasury.rewardVault();
  console.log("新 Treasury.rewardVault:", newVault);

  // Scroll owner
  const scrollOwner = await scroll.owner();
  console.log("Scroll owner:", scrollOwner);

  // Scroll router
  const router = await scroll.pancakeRouter();
  console.log("Scroll router:", router);

  console.log("\n========== 问题分析 ==========");
  if (oldBal > 0n) {
    console.log(`⚠️ 旧 Treasury 还有 ${ethers.formatEther(oldBal)} BNB 没有路由!`);
    console.log("  需要手动调用 routeToRewardVault(0) 取出");
  }
  if (buybackLpReserve > 0n) {
    console.log(`⚠️ Scroll 有 ${ethers.formatEther(buybackLpReserve)} BNB 在回购储备中!`);
    console.log("  需要调用 executeBuybackAndAddLiquidity() 才能使用");
  }
}

main().catch(console.error);
