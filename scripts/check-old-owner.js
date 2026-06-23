const { ethers } = require("hardhat");

async function main() {
  const OLD_SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(OLD_SCROLL);

  // 查 tokenId 1 的 owner
  try {
    const owner1 = await scroll.ownerOf(1);
    console.log("tokenId 1 的 owner:", owner1);

    const reward = await scroll.pendingReward(owner1);
    console.log("待领取分红:", ethers.formatEther(reward), "BNB");
  } catch (e) {
    console.log("tokenId 1 查询失败:", e.message.slice(0, 100));
  }

  // 旧合约 owner
  const owner = await scroll.owner();
  console.log("旧 Scroll owner:", owner);

  // 余额
  const bal = await ethers.provider.getBalance(OLD_SCROLL);
  console.log("旧 Scroll 总余额:", ethers.formatEther(bal), "BNB");

  const buyback = await scroll.buybackLpReserve();
  console.log("回购储备:", ethers.formatEther(buyback), "BNB");

  console.log("\n========== 结论 ==========");
  console.log("旧合约没有 owner 取款函数，BNB 只能通过:");
  console.log("  1. 持有卷轴的人 claim 领走分红部分");
  console.log("  2. 回购储备 0.0097 BNB 永远锁死（除非上 PancakeSwap）");
  console.log("");
  console.log("tokenId 1 的 owner 需要调用 claim() 领走分红");
}

main().catch(console.error);
