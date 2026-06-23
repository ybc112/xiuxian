const { ethers } = require("hardhat");

async function main() {
  const TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const treasuryBal = await ethers.provider.getBalance(TREASURY);
  console.log("Treasury BNB:", ethers.formatEther(treasuryBal));

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(SCROLL);

  const totalDividendReceived = await scroll.totalDividendReceived();
  console.log("Scroll totalDividendReceived:", ethers.formatEther(totalDividendReceived));

  const buybackLpReserve = await scroll.buybackLpReserve();
  console.log("Scroll buybackLpReserve:", ethers.formatEther(buybackLpReserve));

  const totalClaimed = await scroll.totalClaimed();
  console.log("Scroll totalClaimed:", ethers.formatEther(totalClaimed));

  const activeScrolls = await scroll.activeScrolls();
  console.log("Active Scrolls:", activeScrolls.toString());

  const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const treasury = Treasury.attach(TREASURY);
  const vault = await treasury.rewardVault();
  console.log("Treasury.rewardVault:", vault);

  if (treasuryBal > 0n) {
    console.log("\n💰 Treasury 有余额! 正在路由到 Scroll...");

    const [signer] = await ethers.getSigners();
    console.log("调用者:", signer.address);

    const tx = await treasury.routeToRewardVault(0);
    console.log("Tx:", tx.hash);
    await tx.wait();
    console.log("✅ 路由完成!");

    const newTotalDividend = await scroll.totalDividendReceived();
    console.log("新 totalDividendReceived:", ethers.formatEther(newTotalDividend));
    const newBuyback = await scroll.buybackLpReserve();
    console.log("新 buybackLpReserve:", ethers.formatEther(newBuyback));
  } else {
    console.log("\n⚠️ Treasury 余额为 0，无需路由");
  }
}

main().catch(console.error);
