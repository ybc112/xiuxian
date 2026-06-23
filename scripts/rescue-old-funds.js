const { ethers } = require("hardhat");

async function main() {
  const OLD_SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";

  const [signer] = await ethers.getSigners();
  console.log("当前钱包:", signer.address);

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = Scroll.attach(OLD_SCROLL);

  // 检查是否已注册
  const tokenId = await scroll.scrollOf(signer.address);
  if (tokenId > 0n) {
    console.log("该钱包已有卷轴，tokenId:", tokenId.toString());
    const pending = await scroll.pendingReward(signer.address);
    console.log("待领取:", ethers.formatEther(pending), "BNB");
    if (pending > 0n) {
      const tx = await scroll.claim();
      console.log("Claim tx:", tx.hash);
      await tx.wait();
      console.log("Claim 成功!");
    }
    return;
  }

  // 检查 token 余额
  const tokenAddr = await scroll.token();
  const token = await ethers.getContractAt("IERC20", tokenAddr);
  const balance = await token.balanceOf(signer.address);
  console.log("Token 余额:", ethers.formatEther(balance));

  const minHolding1 = await scroll.minHoldings(1);
  console.log("Tier1 最低持有:", ethers.formatEther(minHolding1));

  if (balance < minHolding1) {
    console.log("Token 不足，无法注册");
    return;
  }

  // Step 1: 注册 tier1
  console.log("\n--- Step 1: 注册 Tier 1 ---");
  const approveAmt = await scroll.minHoldings(5) + await scroll.upgradeBurnCosts(2) + await scroll.upgradeBurnCosts(3) + await scroll.upgradeBurnCosts(4) + await scroll.upgradeBurnCosts(5);
  console.log("预授权:", ethers.formatEther(approveAmt));
  await (await token.approve(OLD_SCROLL, approveAmt)).wait();
  console.log("授权完成");

  await (await scroll.register()).wait();
  console.log("注册成功!");

  // 检查 unallocatedTierRewards[1]
  const unalloc1 = await scroll.unallocatedTierRewards(1);
  console.log("Tier1 未分配奖励:", ethers.formatEther(unalloc1), "BNB");

  // Claim tier1
  const pending1 = await scroll.pendingReward(signer.address);
  console.log("Tier1 待领取:", ethers.formatEther(pending1), "BNB");
  if (pending1 > 0n) {
    const tx = await scroll.claim();
    console.log("Claim tx:", tx.hash);
    await tx.wait();
    console.log("Tier1 Claim 成功! 领取:", ethers.formatEther(pending1), "BNB");
  }

  // Step 2: 升级到 tier2
  console.log("\n--- Step 2: 升级到 Tier 2 ---");
  const minHolding2 = await scroll.minHoldings(2);
  const burnCost2 = await scroll.upgradeBurnCosts(2);
  console.log("需要持有:", ethers.formatEther(minHolding2 + burnCost2));
  console.log("当前持有:", ethers.formatEther(balance));

  if (balance >= minHolding2 + burnCost2) {
    await (await scroll.upgrade()).wait();
    console.log("升级到 Tier2 成功!");

    const unalloc2 = await scroll.unallocatedTierRewards(2);
    console.log("Tier2 未分配奖励:", ethers.formatEther(unalloc2), "BNB");

    const pending2 = await scroll.pendingReward(signer.address);
    console.log("Tier2 待领取:", ethers.formatEther(pending2), "BNB");
    if (pending2 > 0n) {
      const tx = await scroll.claim();
      console.log("Claim tx:", tx.hash);
      await tx.wait();
      console.log("Tier2 Claim 成功! 领取:", ethers.formatEther(pending2), "BNB");
    }
  } else {
    console.log("余额不足，无法升级到 Tier2");
  }

  // Step 3: 升级到 tier3
  console.log("\n--- Step 3: 升级到 Tier 3 ---");
  const minHolding3 = await scroll.minHoldings(3);
  const burnCost3 = await scroll.upgradeBurnCosts(3);
  const balanceAfterBurn2 = balance - burnCost2;
  console.log("升级后剩余(估):", ethers.formatEther(balanceAfterBurn2));
  console.log("需要持有:", ethers.formatEther(minHolding3 + burnCost3));

  if (balanceAfterBurn2 >= minHolding3 + burnCost3) {
    await (await scroll.upgrade()).wait();
    console.log("升级到 Tier3 成功!");

    const unalloc3 = await scroll.unallocatedTierRewards(3);
    console.log("Tier3 未分配奖励:", ethers.formatEther(unalloc3), "BNB");

    const pending3 = await scroll.pendingReward(signer.address);
    console.log("Tier3 待领取:", ethers.formatEther(pending3), "BNB");
    if (pending3 > 0n) {
      const tx = await scroll.claim();
      console.log("Claim tx:", tx.hash);
      await tx.wait();
      console.log("Tier3 Claim 成功! 领取:", ethers.formatEther(pending3), "BNB");
    }
  } else {
    console.log("余额不足，无法升级到 Tier3");
  }

  // Step 4: 升级到 tier4
  console.log("\n--- Step 4: 升级到 Tier 4 ---");
  const minHolding4 = await scroll.minHoldings(4);
  const burnCost4 = await scroll.upgradeBurnCosts(4);
  const balanceAfterBurn3 = balanceAfterBurn2 - burnCost3;
  console.log("升级后剩余(估):", ethers.formatEther(balanceAfterBurn3));
  console.log("需要持有:", ethers.formatEther(minHolding4 + burnCost4));

  if (balanceAfterBurn3 >= minHolding4 + burnCost4) {
    await (await scroll.upgrade()).wait();
    console.log("升级到 Tier4 成功!");

    const pending4 = await scroll.pendingReward(signer.address);
    console.log("Tier4 待领取:", ethers.formatEther(pending4), "BNB");
    if (pending4 > 0n) {
      const tx = await scroll.claim();
      console.log("Claim tx:", tx.hash);
      await tx.wait();
      console.log("Tier4 Claim 成功! 领取:", ethers.formatEther(pending4), "BNB");
    }
  } else {
    console.log("余额不足，无法升级到 Tier4");
  }

  // Step 5: 升级到 tier5
  console.log("\n--- Step 5: 升级到 Tier 5 ---");
  const minHolding5 = await scroll.minHoldings(5);
  const burnCost5 = await scroll.upgradeBurnCosts(5);
  const balanceAfterBurn4 = balanceAfterBurn3 - burnCost4;
  console.log("升级后剩余(估):", ethers.formatEther(balanceAfterBurn4));
  console.log("需要持有:", ethers.formatEther(minHolding5 + burnCost5));

  if (balanceAfterBurn4 >= minHolding5 + burnCost5) {
    await (await scroll.upgrade()).wait();
    console.log("升级到 Tier5 成功!");

    const unalloc5 = await scroll.unallocatedTierRewards(5);
    console.log("Tier5 未分配奖励:", ethers.formatEther(unalloc5), "BNB");

    const pending5 = await scroll.pendingReward(signer.address);
    console.log("Tier5 待领取:", ethers.formatEther(pending5), "BNB");
    if (pending5 > 0n) {
      const tx = await scroll.claim();
      console.log("Claim tx:", tx.hash);
      await tx.wait();
      console.log("Tier5 Claim 成功! 领取:", ethers.formatEther(pending5), "BNB");
    }
  } else {
    console.log("余额不足，无法升级到 Tier5");
  }

  // 最终状态
  console.log("\n========== 最终状态 ==========");
  const finalBal = await ethers.provider.getBalance(OLD_SCROLL);
  const finalBuyback = await scroll.buybackLpReserve();
  console.log("旧合约剩余 BNB:", ethers.formatEther(finalBal));
  console.log("其中回购储备:", ethers.formatEther(finalBuyback));
  console.log("其中分红池:", ethers.formatEther(finalBal - finalBuyback));
}

main().catch(console.error);
