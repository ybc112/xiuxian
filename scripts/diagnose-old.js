const { ethers } = require("hardhat");

async function main() {
  const OLD_SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(OLD_SCROLL);

  console.log("========== 旧合约详细诊断 ==========\n");

  // 总览
  const bal = await ethers.provider.getBalance(OLD_SCROLL);
  const totalDividend = await scroll.totalDividendReceived();
  const totalClaimed = await scroll.totalClaimed();
  const buyback = await scroll.buybackLpReserve();
  const activeScrolls = await scroll.activeScrolls();

  console.log("合约 BNB 余额:", ethers.formatEther(bal));
  console.log("总分红收入:", ethers.formatEther(totalDividend));
  console.log("总已领取:", ethers.formatEther(totalClaimed));
  console.log("回购储备:", ethers.formatEther(buyback));
  console.log("活跃卷轴:", activeScrolls.toString());
  console.log("未领取分红:", ethers.formatEther(totalDividend - totalClaimed));
  console.log("实际可提取:", ethers.formatEther(bal - buyback));
  console.log("");

  // 各 tier 详情
  console.log("========== 各 Tier 状态 ==========\n");
  for (let t = 1; t <= 5; t++) {
    const supply = await scroll.tierSupply(t);
    const unallocated = await scroll.unallocatedTierRewards(t);
    const accReward = await scroll.accRewardPerShare(t);
    console.log(`Tier ${t}: supply=${supply}, unallocated=${ethers.formatEther(unallocated)} BNB, accRewardPerShare=${accReward.toString()}`);
  }

  // tokenId 1 详情
  console.log("\n========== TokenId 1 详情 ==========\n");
  try {
    const owner1 = await scroll.ownerOf(1);
    const tier1 = await scroll.tierOfToken(1);
    const pending1 = await scroll.pendingReward(owner1);
    const rewardDebt1 = await scroll.rewardDebt(owner1);

    console.log("Owner:", owner1);
    console.log("Tier:", tier1.toString());
    console.log("Pending reward:", ethers.formatEther(pending1), "BNB");
    console.log("RewardDebt:", rewardDebt1.toString());
  } catch (e) {
    console.log("tokenId 1 不存在或已销毁");
  }

  // 检查其他可能的 tokenId
  console.log("\n========== 检查其他 TokenId ==========\n");
  for (let id = 1; id <= 5; id++) {
    try {
      const owner = await scroll.ownerOf(id);
      const tier = await scroll.tierOfToken(id);
      const pending = await scroll.pendingReward(owner);
      console.log(`TokenId ${id}: owner=${owner}, tier=${tier}, pending=${ethers.formatEther(pending)} BNB`);
    } catch (e) {
      console.log(`TokenId ${id}: 不存在`);
    }
  }

  console.log("\n========== 资金分析 ==========\n");
  // 分红池中: totalDividend - totalClaimed = 理论上未领取的
  // 但实际合约余额 = 未领取分红 + buybackReserve
  // 差额 = bal - buyback - (totalDividend - totalClaimed) 应该约等于0
  const unclaimedDividend = totalDividend - totalClaimed;
  const actualWithdrawable = bal - buyback;
  const diff = actualWithdrawable - unclaimedDividend;

  console.log("理论未领取分红:", ethers.formatEther(unclaimedDividend), "BNB");
  console.log("实际可提取(余额-回购):", ethers.formatEther(actualWithdrawable), "BNB");
  console.log("差额:", ethers.formatEther(diff), "BNB");

  if (unclaimedDividend > 0n && actualWithdrawable > 0n) {
    console.log("\n========== 提取方案 ==========\n");

    // 检查 tokenId 1 的 owner 是否能领
    try {
      const owner1 = await scroll.ownerOf(1);
      const pending1 = await scroll.pendingReward(owner1);
      if (pending1 > 0n) {
        console.log(`tokenId 1 的 owner (${owner1}) 可以 claim ${ethers.formatEther(pending1)} BNB`);
      } else {
        console.log(`tokenId 1 的 owner (${owner1}) pending = 0，无法 claim`);
        console.log("原因: 旧合约升级后从低 tier 移除，低 tier 的分红无法领取");
      }
    } catch (e) {
      console.log("tokenId 1 无法查询");
    }

    // 分析各 tier 的 unallocated
    let totalUnallocated = 0n;
    for (let t = 1; t <= 5; t++) {
      const unallocated = await scroll.unallocatedTierRewards(t);
      if (unallocated > 0n) {
        console.log(`Tier ${t} 有 ${ethers.formatEther(unallocated)} BNB 未分配奖励`);
        totalUnallocated += unallocated;
      }
    }
    if (totalUnallocated > 0n) {
      console.log(`\n总未分配奖励: ${ethers.formatEther(totalUnallocated)} BNB`);
      console.log("这些可以通过新用户注册来领取");
    }

    // 分析 accRewardPerShare 中锁死的资金
    console.log("\n--- 锁死资金分析 ---");
    for (let t = 1; t <= 5; t++) {
      const supply = await scroll.tierSupply(t);
      const unallocated = await scroll.unallocatedTierRewards(t);
      if (supply == 0n && unallocated == 0n) {
        // accRewardPerShare > 0 但 supply = 0 意味着资金锁死
        const accReward = await scroll.accRewardPerShare(t);
        if (accReward > 0n) {
          console.log(`Tier ${t}: accRewardPerShare > 0 但 supply = 0，该 tier 有锁死资金`);
        }
      }
    }
  }
}

main().catch(console.error);
