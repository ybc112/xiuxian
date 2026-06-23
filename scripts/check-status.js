const { ethers } = require("hardhat");

async function main() {
  const TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  // Treasury BNB 余额
  const treasuryBal = await ethers.provider.getBalance(TREASURY);
  console.log("Treasury BNB:", ethers.formatEther(treasuryBal));

  // Scroll 分红池
  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(SCROLL);

  const dividendPool = await scroll.dividendPool();
  console.log("Scroll 分红池:", ethers.formatEther(dividendPool));

  const buybackReserve = await scroll.buybackReserve();
  console.log("Scroll 回购储备:", ethers.formatEther(buybackReserve));

  // Treasury rewardVault
  const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const treasury = Treasury.attach(TREASURY);
  const vault = await treasury.rewardVault();
  console.log("Treasury.rewardVault:", vault);

  if (treasuryBal > 0n) {
    console.log("\n💰 Treasury 有余额，可以路由到 Scroll 分红池!");
    console.log("运行: npx hardhat run scripts/route-bnb.js --network bsc");
  }
}

main().catch(console.error);
