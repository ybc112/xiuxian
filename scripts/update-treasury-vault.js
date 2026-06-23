const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("当前钱包:", deployer.address);

  const OLD_TREASURY = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";
  const NEW_SCROLL = "0x261ca0Ef0aDd811Bc7Fd6669A104A402C6Dcfee1";
  const KEY4 = "0xc324Fa989CA3d53641822E9514b97b5Dcdce1fcB";

  // Step 1: 给 Key4 转 BNB 作为 gas
  console.log("\nStep 1: 给 Key4 转 0.005 BNB...");
  const tx1 = await deployer.sendTransaction({
    to: KEY4,
    value: ethers.parseEther("0.01")
  });
  await tx1.wait();
  console.log("  ✅ 转账成功");

  // Step 2: 用 Key4 更新旧 Treasury 的 rewardVault
  console.log("\nStep 2: 用 Key4 更新旧 Treasury 的 rewardVault...");
  const key4 = new ethers.Wallet("0xb8448c2873d1199b0ccbc742317866b9c786eb5034cb5cb671d4b018704f844a", ethers.provider);
  const treasury = await ethers.getContractAt("CultivationTaxTreasury", OLD_TREASURY, key4);

  const tx2 = await treasury.setRewardVault(NEW_SCROLL);
  await tx2.wait();
  console.log("  ✅ rewardVault 已更新");

  // 验证
  const newVault = await treasury.rewardVault();
  console.log("\n验证:");
  console.log("  rewardVault:", newVault);
  console.log("  新 Scroll:", NEW_SCROLL);
  console.log("  匹配:", newVault.toLowerCase() === NEW_SCROLL.toLowerCase() ? "✅" : "❌");

  console.log("\n=== 完成! ===");
  console.log("Four.meme 代币税 → 旧 Treasury → 新 Scroll (V3)");
  console.log("不需要修改 Four.meme 设置!");
}

main().catch(console.error);
