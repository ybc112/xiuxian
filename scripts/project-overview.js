const { ethers } = require("hardhat");

async function main() {
  // 已知地址
  const OLD_SCROLL = "0xDbF26770983a41c8e4e126915D35f853e7A0CF90";
  const NEW_SCROLL = "0xE4b2D49aB544bc9F927bFc6bA23b5c9cdfba8062";
  const OLD_TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const NEW_TREASURY = "0xF8DE4847C68378cb9D9d77C616aB755c17aCa11F";
  const TOKEN = "0x89c4d86fde0c0f013484d0677f27b79722ba6ede";

  // 两个钱包
  const WALLET1 = "0xB488AcD11351ce8CD516e87EbE1782D73699F170"; // Key1 (当前 .env)
  const WALLET2 = "0x9B0c7994F4289Aa247d06A96C4447EB36c13CfBb"; // Key2

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║          项目全局状态分析                             ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ===== 钱包余额 =====
  console.log("========== 钱包余额 ==========\n");
  const bal1 = await ethers.provider.getBalance(WALLET1);
  const bal2 = await ethers.provider.getBalance(WALLET2);
  console.log(`钱包1 (${WALLET1.slice(0,10)}...): ${ethers.formatEther(bal1)} BNB`);
  console.log(`钱包2 (${WALLET2.slice(0,10)}...): ${ethers.formatEther(bal2)} BNB`);

  // ===== Token 合约 =====
  console.log("\n========== Token 合约 ==========\n");
  const token = await ethers.getContractAt("IERC20", TOKEN);
  const tokenBal1 = await token.balanceOf(WALLET1);
  const tokenBal2 = await token.balanceOf(WALLET2);
  const totalSupply = await token.totalSupply();
  console.log(`Token 地址: ${TOKEN}`);
  console.log(`总供应量: ${ethers.formatEther(totalSupply)}`);
  console.log(`钱包1 持有: ${ethers.formatEther(tokenBal1)}`);
  console.log(`钱包2 持有: ${ethers.formatEther(tokenBal2)}`);

  // ===== 旧 Scroll =====
  console.log("\n========== 旧 Scroll 合约 ==========\n");
  const OldScroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const oldScroll = OldScroll.attach(OLD_SCROLL);

  const oldBal = await ethers.provider.getBalance(OLD_SCROLL);
  const oldOwner = await oldScroll.owner();
  const oldToken = await oldScroll.token();
  const oldActive = await oldScroll.activeScrolls();
  const oldNextId = await oldScroll.nextTokenId();
  const oldTotalDiv = await oldScroll.totalDividendReceived();
  const oldTotalClaimed = await oldScroll.totalClaimed();
  const oldBuyback = await oldScroll.buybackLpReserve();

  console.log(`地址: ${OLD_SCROLL}`);
  console.log(`Owner: ${oldOwner}`);
  console.log(`Token: ${oldToken}`);
  console.log(`BNB余额: ${ethers.formatEther(oldBal)}`);
  console.log(`活跃卷轴: ${oldActive}`);
  console.log(`下一个tokenId: ${oldNextId}`);
  console.log(`总分红收入: ${ethers.formatEther(oldTotalDiv)}`);
  console.log(`总已领取: ${ethers.formatEther(oldTotalClaimed)}`);
  console.log(`回购储备: ${ethers.formatEther(oldBuyback)}`);
  console.log(`未领取分红: ${ethers.formatEther(oldTotalDiv - oldTotalClaimed)}`);

  // 各 tier supply
  for (let t = 1; t <= 5; t++) {
    const supply = await oldScroll.tierSupply(t);
    const unalloc = await oldScroll.unallocatedTierRewards(t);
    console.log(`  Tier ${t}: supply=${supply}, unallocated=${ethers.formatEther(unalloc)}`);
  }

  // ===== 新 Scroll =====
  console.log("\n========== 新 Scroll 合约 ==========\n");
  const NewScroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const newScroll = NewScroll.attach(NEW_SCROLL);

  try {
    const newOwner = await newScroll.owner();
    const newToken = await newScroll.token();
    const newBal = await ethers.provider.getBalance(NEW_SCROLL);
    const newActive = await newScroll.activeScrolls();
    const newTotalDiv = await newScroll.totalDividendReceived();
    const newBuyback = await newScroll.buybackLpReserve();

    console.log(`地址: ${NEW_SCROLL}`);
    console.log(`Owner: ${newOwner}`);
    console.log(`Token: ${newToken}`);
    console.log(`BNB余额: ${ethers.formatEther(newBal)}`);
    console.log(`活跃卷轴: ${newActive}`);
    console.log(`总分红收入: ${ethers.formatEther(newTotalDiv)}`);
    console.log(`回购储备: ${ethers.formatEther(newBuyback)}`);
  } catch (e) {
    console.log(`新 Scroll 查询失败: ${e.message.slice(0, 100)}`);
  }

  // ===== 旧 Treasury =====
  console.log("\n========== 旧 Treasury 合约 ==========\n");
  const OldTreasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const oldTreasury = OldTreasury.attach(OLD_TREASURY);

  const oldTBal = await ethers.provider.getBalance(OLD_TREASURY);
  const oldTOwner = await oldTreasury.owner();
  const oldTVault = await oldTreasury.rewardVault();
  const oldTReceived = await oldTreasury.totalReceived();
  const oldTRouted = await oldTreasury.totalRouted();

  console.log(`地址: ${OLD_TREASURY}`);
  console.log(`Owner: ${oldTOwner}`);
  console.log(`BNB余额: ${ethers.formatEther(oldTBal)}`);
  console.log(`rewardVault: ${oldTVault}`);
  console.log(`总接收: ${ethers.formatEther(oldTReceived)}`);
  console.log(`总路由: ${ethers.formatEther(oldTRouted)}`);

  // ===== 新 Treasury =====
  console.log("\n========== 新 Treasury 合约 ==========\n");
  const newTreasury = OldTreasury.attach(NEW_TREASURY);

  const newTBal = await ethers.provider.getBalance(NEW_TREASURY);
  const newTOwner = await newTreasury.owner();
  const newTVault = await newTreasury.rewardVault();
  const newTReceived = await newTreasury.totalReceived();
  const newTRouted = await newTreasury.totalRouted();

  console.log(`地址: ${NEW_TREASURY}`);
  console.log(`Owner: ${newTOwner}`);
  console.log(`BNB余额: ${ethers.formatEther(newTBal)}`);
  console.log(`rewardVault: ${newTVault}`);
  console.log(`总接收: ${ethers.formatEther(newTReceived)}`);
  console.log(`总路由: ${ethers.formatEther(newTRouted)}`);

  // ===== 关系图 =====
  console.log("\n========== 合约关系图 ==========\n");
  console.log("Token (Four.meme)");
  console.log("  └── 税收 → 旧 Treasury / 新 Treasury");
  console.log("              └── routeToRewardVault → Scroll 分红池");
  console.log("");
  console.log(`旧 Treasury.rewardVault = ${oldTVault}`);
  console.log(`  → 指向: ${oldTVault.toLowerCase() === OLD_SCROLL.toLowerCase() ? '旧 Scroll ✓' : oldTVault === ethers.ZeroAddress ? '未设置 ✗' : '其他合约 ⚠'}`);
  console.log(`新 Treasury.rewardVault = ${newTVault}`);
  console.log(`  → 指向: ${newTVault.toLowerCase() === NEW_SCROLL.toLowerCase() ? '新 Scroll ✓' : newTVault === ethers.ZeroAddress ? '未设置 ✗' : '其他合约 ⚠'}`);

  // ===== Owner 匹配 =====
  console.log("\n========== Owner 权限分析 ==========\n");
  console.log(`钱包1 ${WALLET1}:`);
  console.log(`  旧 Scroll owner: ${oldOwner.toLowerCase() === WALLET1.toLowerCase() ? '✓ 是' : '✗ 否'}`);
  console.log(`  旧 Treasury owner: ${oldTOwner.toLowerCase() === WALLET1.toLowerCase() ? '✓ 是' : '✗ 否'}`);
  console.log(`  新 Treasury owner: ${newTOwner.toLowerCase() === WALLET1.toLowerCase() ? '✓ 是' : '✗ 否'}`);
  console.log(`钱包2 ${WALLET2}:`);
  console.log(`  旧 Scroll owner: ${oldOwner.toLowerCase() === WALLET2.toLowerCase() ? '✓ 是' : '✗ 否'}`);
  console.log(`  旧 Treasury owner: ${oldTOwner.toLowerCase() === WALLET2.toLowerCase() ? '✓ 是' : '✗ 否'}`);
  console.log(`  新 Treasury owner: ${newTOwner.toLowerCase() === WALLET2.toLowerCase() ? '✓ 是' : '✗ 否'}`);

  // ===== 资金汇总 =====
  console.log("\n========== 资金汇总 ==========\n");
  const totalLocked = oldBal + newBal + oldTBal + newTBal;
  const oldScrollDividend = oldTotalDiv - oldTotalClaimed;
  console.log(`旧 Scroll BNB: ${ethers.formatEther(oldBal)} (分红池 ${ethers.formatEther(oldScrollDividend)} + 回购 ${ethers.formatEther(oldBuyback)})`);
  console.log(`新 Scroll BNB: ${ethers.formatEther(await ethers.provider.getBalance(NEW_SCROLL))}`);
  console.log(`旧 Treasury BNB: ${ethers.formatEther(oldTBal)}`);
  console.log(`新 Treasury BNB: ${ethers.formatEther(newTBal)}`);
  console.log(`系统总锁仓: ${ethers.formatEther(totalLocked)} BNB`);
}

main().catch(console.error);
