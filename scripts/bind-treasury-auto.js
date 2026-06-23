// scripts/bind-treasury-auto.js
// 一键绑定脚本 - 当你有 Treasury owner 私钥时使用
// 使用方法: node scripts/bind-treasury-auto.js

const { ethers } = require("hardhat");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  console.log("=".repeat(60));
  console.log("  Treasury.setRewardVault 一键绑定");
  console.log("=".repeat(60));
  console.log("");

  // 自动读取 deployment-info.json
  const infoPath = path.join(__dirname, "..", "deployment-info.json");
  if (fs.existsSync(infoPath)) {
    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
    console.log("📂 找到历史部署信息:");
    console.log(`  Token: ${info.token}`);
    console.log(`  Scroll: ${info.scroll}`);
    console.log(`  Treasury: ${info.treasury || "未记录"}`);
    console.log("");
  }

  // 询问参数
  const treasuryAddress = await ask("请输入 Treasury 地址: ");
  const scrollAddress = await ask("请输入 Scroll 地址 (按回车用历史): ") ||
    (fs.existsSync(infoPath) ? JSON.parse(fs.readFileSync(infoPath, "utf8")).scroll : "");

  if (!ethers.isAddress(treasuryAddress)) {
    throw new Error("❌ Treasury 地址无效");
  }
  if (!ethers.isAddress(scrollAddress)) {
    throw new Error("❌ Scroll 地址无效");
  }

  console.log("");
  console.log("📋 待执行操作:");
  console.log(`  Treasury: ${treasuryAddress}`);
  console.log(`  Scroll: ${scrollAddress}`);
  console.log("");

  const [signer] = await ethers.getSigners();
  console.log(`🔑 当前钱包: ${signer.address}`);

  const Treasury = await ethers.getContractFactory("CultivationTaxTreasury");
  const treasury = Treasury.attach(treasuryAddress);

  // 检查 owner
  const owner = await treasury.owner();
  console.log(`👑 Treasury owner: ${owner}`);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`❌ 当前钱包不是 Treasury owner! 需要的 owner: ${owner}`);
  }

  // 检查是否已绑定
  const currentVault = await treasury.rewardVault();
  if (currentVault.toLowerCase() === scrollAddress.toLowerCase()) {
    console.log("ℹ️  Scroll 已经被绑定为 rewardVault,无需操作");
    return;
  }
  if (currentVault !== ethers.ZeroAddress) {
    console.log(`⚠️  Treasury 已经绑定了其他合约: ${currentVault}`);
    const confirm = await ask("是否覆盖? (y/n): ");
    if (confirm.toLowerCase() !== "y") {
      console.log("已取消");
      return;
    }
  }

  // 执行绑定
  console.log("📤 发送 setRewardVault 交易...");
  const tx = await treasury.setRewardVault(scrollAddress);
  console.log(`  Tx: ${tx.hash}`);
  console.log("  等待确认...");
  const receipt = await tx.wait();
  console.log(`  ✅ 已确认 (Block: ${receipt.blockNumber})`);

  // 验证
  const newVault = await treasury.rewardVault();
  console.log(`✅ Treasury.rewardVault = ${newVault}`);

  if (newVault.toLowerCase() === scrollAddress.toLowerCase()) {
    console.log("");
    console.log("🎉 绑定成功!");
    console.log("");
    console.log("📝 接下来可以调用 Treasury.routeToRewardVault(0) 把 BNB 路由到分红池");
  }
}

main().catch(error => {
  console.error("");
  console.error("❌ 绑定失败:", error.message);
  process.exit(1);
});
