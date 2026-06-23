const { ethers } = require("hardhat");

async function main() {
  const OLD_SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";
  const NEW_SCROLL = "0xE4b2D49aB544bc9F927bFc6bA23b5c9cdfba8062";
  const OLD_TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const NEW_TREASURY = "0xF8DE4847C68378cb9D9d77C616aB755c17aCa11F";

  console.log("========== 旧合约 ==========");

  const oldBal = await ethers.provider.getBalance(OLD_SCROLL);
  console.log("旧 Scroll BNB 余额:", ethers.formatEther(oldBal));

  const OldScroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const oldScroll = OldScroll.attach(OLD_SCROLL);

  const oldDividend = await oldScroll.totalDividendReceived();
  console.log("旧 Scroll totalDividendReceived:", ethers.formatEther(oldDividend));

  const oldBuyback = await oldScroll.buybackLpReserve();
  console.log("旧 Scroll buybackLpReserve:", ethers.formatEther(oldBuyback));

  const oldClaimed = await oldScroll.totalClaimed();
  console.log("旧 Scroll totalClaimed:", ethers.formatEther(oldClaimed));

  const oldActive = await oldScroll.activeScrolls();
  console.log("旧 Scroll activeScrolls:", oldActive.toString());

  const oldOwner = await oldScroll.owner();
  console.log("旧 Scroll owner:", oldOwner);

  console.log("\n========== 新合约 ==========");

  const newBal = await ethers.provider.getBalance(NEW_SCROLL);
  console.log("新 Scroll BNB 余额:", ethers.formatEther(newBal));

  const NewScroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const newScroll = NewScroll.attach(NEW_SCROLL);

  const newDividend = await newScroll.totalDividendReceived();
  console.log("新 Scroll totalDividendReceived:", ethers.formatEther(newDividend));

  const newBuyback = await newScroll.buybackLpReserve();
  console.log("新 Scroll buybackLpReserve:", ethers.formatEther(newBuyback));

  const newActive = await newScroll.activeScrolls();
  console.log("新 Scroll activeScrolls:", newActive.toString());

  console.log("\n========== Treasury ==========");

  const oldTBal = await ethers.provider.getBalance(OLD_TREASURY);
  console.log("旧 Treasury BNB:", ethers.formatEther(oldTBal));

  const newTBal = await ethers.provider.getBalance(NEW_TREASURY);
  console.log("新 Treasury BNB:", ethers.formatEther(newTBal));

  console.log("\n========== 分析 ==========");
  console.log("旧 Scroll 合约里锁住的 BNB:", ethers.formatEther(oldBal));
  console.log("  - 分红池 (可被 claim 领走):", ethers.formatEther(oldDividend - oldClaimed));
  console.log("  - 回购储备 (无法取出):", ethers.formatEther(oldBuyback));
}

main().catch(console.error);
