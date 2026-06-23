// scripts/route-bnb.js
// 路由 BNB 到 Scroll 分红池
// 使用方法: node scripts/route-bnb.js [amountInBNB]

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 自动读取 deployment-info.json
  const infoPath = path.join(__dirname, "..", "deployment-info.json");
  let treasuryAddress, scrollAddress;

  if (fs.existsSync(infoPath)) {
    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
    treasuryAddress = info.treasury;
    scrollAddress = info.scroll;
  }

  // 从命令行参数获取
  const args = process.argv.slice(2);
  let amount = "0"; // 0 表示全部

  args.forEach((arg, i) => {
    if (arg === "--treasury" && args[i + 1]) treasuryAddress = args[i + 1];
    if (arg === "--scroll" && args[i + 1]) scrollAddress = args[i + 1];
    if (arg === "--amount" && args[i + 1]) amount = args[i + 1];
  });

  console.log("=".repeat(60));
  console.log("  路由 BNB 到 Scroll 分红池");
  console.log("=".repeat(60));
  console.log("");

  if (!treasuryAddress) {
    treasuryAddress = await ask("请输入 Treasury 地址: ");
  }
  if (!scrollAddress) {
    scrollAddress = await ask("请输入 Scroll 地址: ");
  }

  const Treasury = await ethers.getContractFactory("CultivationTaxTreasury");
  const treasury = Treasury.attach(treasuryAddress);

  const [signer] = await ethers.getSigners();
  console.log(`🔑 调用者: ${signer.address}`);

  // 检查 Treasury 余额
  const balance = await ethers.provider.getBalance(treasuryAddress);
  console.log(`💰 Treasury BNB 余额: ${ethers.formatEther(balance)} BNB`);

  if (balance === 0n) {
    console.log("⚠️  Treasury 余额为 0,无需路由");
    return;
  }

  // 检查 Scroll 当前分红池
  const Scroll = await ethers.getContractFactory("CultivationScroll");
  const scroll = Scroll.attach(scrollAddress);
  const dividendPool = await scroll.dividendPool();
  console.log(`📊 Scroll 当前分红池: ${ethers.formatEther(dividendPool)} BNB`);

  // 路由金额
  const routeAmount = amount === "0" ? balance : ethers.parseEther(amount);
  console.log(`📤 路由金额: ${ethers.formatEther(routeAmount)} BNB`);

  if (routeAmount > balance) {
    throw new Error(`❌ 金额超过 Treasury 余额`);
  }

  // 执行路由
  console.log("📤 发送 routeToRewardVault 交易...");
  const tx = await treasury.routeToRewardVault(routeAmount, { value: 0 }); // Treasury 已有 BNB, value=0
  console.log(`  Tx: ${tx.hash}`);
  console.log("  等待确认...");
  const receipt = await tx.wait();
  console.log(`  ✅ 已确认 (Block: ${receipt.blockNumber})`);

  // 验证
  const newDividendPool = await scroll.dividendPool();
  console.log(`📊 Scroll 新分红池: ${ethers.formatEther(newDividendPool)} BNB`);
  console.log("");
  console.log("🎉 路由完成!");
}

function ask(question) {
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans);
  }));
}

main().catch(error => {
  console.error("");
  console.error("❌ 路由失败:", error.message);
  process.exit(1);
});
