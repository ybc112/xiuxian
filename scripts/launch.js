// scripts/launch.js
// 一键发射脚本 - 输入代币地址，自动完成所有操作
// 用法: npx hardhat run scripts/launch.js --network bsc
// 然后按提示输入代币地址和 Treasury 地址

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const APP_JSX_PATH = path.join(__dirname, "..", "src", "App.jsx");
const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap BSC

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║          修仙卷轴 - 一键发射绑定部署脚本            ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  // ========== 1. 读取参数 ==========
  const args = process.argv.slice(2);
  let TOKEN_ADDRESS = "";
  let TREASURY_ADDRESS = "";

  // 解析命令行参数 --token 0x... --treasury 0x...
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--token" && args[i + 1]) TOKEN_ADDRESS = args[i + 1];
    if (args[i] === "--treasury" && args[i + 1]) TREASURY_ADDRESS = args[i + 1];
  }

  // 如果没有命令行参数，从环境变量读取
  if (!TOKEN_ADDRESS) TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "";
  if (!TREASURY_ADDRESS) TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "";

  // 交互式输入
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => rl.question(q, a => r(a.trim())));

  if (!TOKEN_ADDRESS) {
    TOKEN_ADDRESS = await ask("请输入 Four.meme 代币地址: ");
  }
  if (!TREASURY_ADDRESS) {
    TREASURY_ADDRESS = await ask("请输入 Treasury 金库地址 (没有则回车跳过): ");
  }
  rl.close();

  // 校验
  if (!ethers.isAddress(TOKEN_ADDRESS)) {
    throw new Error("代币地址无效: " + TOKEN_ADDRESS);
  }
  if (TREASURY_ADDRESS && !ethers.isAddress(TREASURY_ADDRESS)) {
    throw new Error("Treasury 地址无效: " + TREASURY_ADDRESS);
  }

  console.log("");
  console.log("📋 配置:");
  console.log(`  代币: ${TOKEN_ADDRESS}`);
  console.log(`  金库: ${TREASURY_ADDRESS || "无"}`);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log(`🔑 部署者: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 余额: ${ethers.formatEther(bal)} BNB`);
  console.log("");

  // ========== 2. 部署 Scroll ==========
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 步骤 1/5: 部署 CultivationScroll 合约");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = await Scroll.deploy(
    TOKEN_ADDRESS,
    "Cultivation Scroll",
    "SCROLL",
    deployer.address
  );
  await scroll.waitForDeployment();
  const scrollAddress = await scroll.getAddress();
  console.log(`  ✅ Scroll: ${scrollAddress}`);

  // ========== 3. 配置 Router ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚙️  步骤 2/5: 配置 PancakeSwap Router");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const setRouterTx = await scroll.setRouter(ROUTER_ADDRESS);
  await setRouterTx.wait();
  console.log(`  ✅ Router: ${ROUTER_ADDRESS}`);

  // ========== 4. 绑定 Treasury ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔗 步骤 3/5: 绑定 Treasury.setRewardVault");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (TREASURY_ADDRESS) {
    const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
    const treasury = Treasury.attach(TREASURY_ADDRESS);
    const owner = await treasury.owner();

    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      const currentVault = await treasury.rewardVault();
      if (currentVault.toLowerCase() === scrollAddress.toLowerCase()) {
        console.log("  ℹ️  已绑定，跳过");
      } else {
        const tx = await treasury.setRewardVault(scrollAddress);
        await tx.wait();
        console.log(`  ✅ Treasury 已绑定 Scroll`);
      }
    } else {
      console.log(`  ⚠️  当前钱包不是 owner (${owner})`);
      console.log(`  📝 请 owner 调用: Treasury.setRewardVault("${scrollAddress}")`);
    }
  } else {
    console.log("  ⏭️  跳过 (未提供 Treasury 地址)");
  }

  // ========== 5. 更新前端 ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎨 步骤 4/5: 更新前端合约地址");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let appCode = fs.readFileSync(APP_JSX_PATH, "utf8");

  // 替换 tokenAddress
  appCode = appCode.replace(
    /tokenAddress:\s*"[^"]*"/,
    `tokenAddress: "${TOKEN_ADDRESS}"`
  );
  // 替换 scrollAddress
  appCode = appCode.replace(
    /scrollAddress:\s*"[^"]*"/,
    `scrollAddress: "${scrollAddress}"`
  );

  fs.writeFileSync(APP_JSX_PATH, appCode, "utf8");
  console.log(`  ✅ App.jsx 已更新`);
  console.log(`     tokenAddress: "${TOKEN_ADDRESS}"`);
  console.log(`     scrollAddress: "${scrollAddress}"`);

  // ========== 6. 推送 GitHub ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 步骤 5/5: 推送到 GitHub");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    execSync('git add src/App.jsx', { cwd: path.join(__dirname, ".."), stdio: "pipe" });
    const commitMsg = `feat: bind token ${TOKEN_ADDRESS.slice(0, 10)}... scroll ${scrollAddress.slice(0, 10)}...`;
    execSync(`git commit -m "${commitMsg}"`, { cwd: path.join(__dirname, ".."), stdio: "pipe" });
    execSync('git push origin main', { cwd: path.join(__dirname, ".."), stdio: "pipe" });
    console.log("  ✅ 已推送到 GitHub");
  } catch (e) {
    console.log("  ⚠️  Git 推送失败，请手动推送:");
    console.log("     git add src/App.jsx && git commit -m 'update' && git push");
  }

  // ========== 完成 ==========
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║                    🎉 全部完成!                      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📝 部署结果:");
  console.log(`  Token:    ${TOKEN_ADDRESS}`);
  console.log(`  Scroll:   ${scrollAddress}`);
  console.log(`  Treasury: ${TREASURY_ADDRESS || "未绑定"}`);
  console.log("");
  console.log("🔗 BscScan:");
  console.log(`  https://bscscan.com/address/${scrollAddress}`);
  console.log("");
  console.log("💡 后续操作:");
  console.log("  1. Treasury 收到税后: npx hardhat run scripts/route-bnb.js --network bsc");
  console.log("  2. 验证合约: npx hardhat verify --network bsc " + scrollAddress + " " + TOKEN_ADDRESS + ' "Cultivation Scroll" "SCROLL" ' + deployer.address);
  console.log("");

  // 保存部署记录
  const record = {
    timestamp: new Date().toISOString(),
    token: TOKEN_ADDRESS,
    scroll: scrollAddress,
    treasury: TREASURY_ADDRESS || "",
    owner: deployer.address
  };
  const recordPath = path.join(__dirname, "..", "deployments.json");
  let records = [];
  if (fs.existsSync(recordPath)) {
    records = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  }
  records.push(record);
  fs.writeFileSync(recordPath, JSON.stringify(records, null, 2));
  console.log("💾 部署记录已保存到 deployments.json");
}

main().catch(e => {
  console.error("");
  console.error("❌ 失败:", e.message);
  process.exit(1);
});
