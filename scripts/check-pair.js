const { ethers } = require("hardhat");

async function main() {
  // PancakeSwap Factory on BSC
  const FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
  const TOKEN = "0x26dcad18bbcd72923733aae9986b962a786e5a58";
  const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

  const factory = new ethers.Contract(FACTORY, [
    "function getPair(address,address) view returns (address)"
  ], ethers.provider);

  const pair = await factory.getPair(TOKEN, WBNB);
  console.log("PancakeSwap Pair:", pair);

  if (pair === "0x0000000000000000000000000000000000000000") {
    console.log("\n❌ 这个代币在 PancakeSwap 上还没有流动性池!");
    console.log("executeBuybackAndAddLiquidity 需要已有交易对才能工作。");
    console.log("你需要先在 PancakeSwap 上手动添加初始流动性。");
  } else {
    console.log("\n✅ 已有流动性池:", pair);
  }
}

main().catch(console.error);
