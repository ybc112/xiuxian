// scripts/deploy-v3.js
// 一体化部署脚本 - 部署新 Treasury + 新 Scroll + 绑定 + 配置 + 更新前端 + 推送
// 用法: npx hardhat run scripts/deploy-v3.js --network bsc

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const TOKEN_ADDRESS = "0x89c4d86fde0c0f013484d0677f27b79722ba6ede";
const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap BSC
const APP_JSX_PATH = path.join(__dirname, "..", "src", "App.jsx");
const ENV_PATH = path.join(__dirname, "..", ".env");

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     修仙卷轴 V3 一体化部署                          ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("部署者:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("余额:", ethers.formatEther(bal), "BNB");

  if (parseFloat(ethers.formatEther(bal)) < 0.01) {
    console.log("");
    console.log("❌ 余额不足，需要至少 0.01 BNB 来部署");
    process.exit(1);
  }

  // ========== Step 1: 部署新 Treasury ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 Step 1/6: 部署 CultivationTaxTreasury");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("  ✅ Treasury:", treasuryAddress);

  // ========== Step 2: 部署新 Scroll ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 Step 2/6: 部署 CultivationScroll (V3 修复版)");
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
  console.log("  ✅ Scroll:", scrollAddress);

  // ========== Step 3: 配置 Router ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚙️  Step 3/6: 配置 PancakeSwap Router");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const setRouterTx = await scroll.setRouter(ROUTER_ADDRESS);
  await setRouterTx.wait();
  console.log("  ✅ Router:", ROUTER_ADDRESS);

  // ========== Step 4: 绑定 Treasury → Scroll ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔗 Step 4/6: 绑定 Treasury.setRewardVault → Scroll");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const bindTx = await treasury.setRewardVault(scrollAddress);
  await bindTx.wait();
  const vault = await treasury.rewardVault();
  console.log("  ✅ rewardVault:", vault);

  // ========== Step 5: 更新 .env 和 App.jsx ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎨 Step 5/6: 更新 .env 和前端地址");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 更新 .env
  let envContent = fs.readFileSync(ENV_PATH, "utf8");
  envContent = envContent.replace(
    /TREASURY_ADDRESS=.*/,
    `TREASURY_ADDRESS=${treasuryAddress}`
  );
  envContent = envContent.replace(
    /VITE_SCROLL_ADDRESS=.*/,
    `VITE_SCROLL_ADDRESS=${scrollAddress}`
  );
  // 确保有 VITE_TREASURY_ADDRESS
  if (envContent.includes("VITE_TREASURY_ADDRESS=")) {
    envContent = envContent.replace(
      /VITE_TREASURY_ADDRESS=.*/,
      `VITE_TREASURY_ADDRESS=${treasuryAddress}`
    );
  } else {
    envContent += `\nVITE_TREASURY_ADDRESS=${treasuryAddress}`;
  }
  fs.writeFileSync(ENV_PATH, envContent, "utf8");
  console.log("  ✅ .env 已更新");

  // 更新 App.jsx
  let appCode = fs.readFileSync(APP_JSX_PATH, "utf8");
  appCode = appCode.replace(
    /scrollAddress:\s*"[^"]*"/,
    `scrollAddress: "${scrollAddress}"`
  );
  fs.writeFileSync(APP_JSX_PATH, appCode, "utf8");
  console.log("  ✅ App.jsx 已更新");
  console.log(`     scrollAddress: "${scrollAddress}"`);

  // ========== Step 6: 推送 GitHub ==========
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Step 6/6: 推送到 GitHub");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const { execSync } = require("child_process");
  const cwd = path.join(__dirname, "..");
  try {
    execSync('git add src/App.jsx .env contracts/CultivationScroll.sol test/CultivationScroll.test.js', { cwd, stdio: "pipe" });
    const commitMsg = `feat: V3 deploy scroll ${scrollAddress.slice(0, 10)}... treasury ${treasuryAddress.slice(0, 10)}...`;
    execSync(`git commit -m "${commitMsg}"`, { cwd, stdio: "pipe" });
    execSync('git push origin main', { cwd, stdio: "pipe" });
    console.log("  ✅ 已推送到 GitHub");
  } catch (e) {
    console.log("  ⚠️  Git 推送失败，请手动推送:");
    console.log("     git add . && git commit -m 'V3 deploy' && git push");
  }

  // ========== 完成 ==========
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║                    🎉 部署完成!                      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📝 部署结果:");
  console.log(`  Token:    ${TOKEN_ADDRESS}`);
  console.log(`  Scroll:   ${scrollAddress}`);
  console.log(`  Treasury: ${treasuryAddress}`);
  console.log(`  Owner:    ${deployer.address}`);
  console.log("");
  console.log("🔗 BscScan:");
  console.log(`  Scroll:   https://bscscan.com/address/${scrollAddress}`);
  console.log(`  Treasury: https://bscscan.com/address/${treasuryAddress}`);
  console.log("");
  console.log("📝 后续操作:");
  console.log("  1. 去 Four.meme 把税收钱包改为新 Treasury 地址");
  console.log(`     新 Treasury: ${treasuryAddress}`);
  console.log("  2. 验证合约:");
  console.log(`     npx hardhat verify --network bsc ${scrollAddress} ${TOKEN_ADDRESS} "Cultivation Scroll" "SCROLL" ${deployer.address}`);
  console.log(`     npx hardhat verify --network bsc ${treasuryAddress} ${deployer.address}`);

  // 保存部署记录
  const record = {
    version: "V3",
    timestamp: new Date().toISOString(),
    token: TOKEN_ADDRESS,
    scroll: scrollAddress,
    treasury: treasuryAddress,
    owner: deployer.address,
    router: ROUTER_ADDRESS,
    changes: "Fixed tier dividend: upgraded users keep lower-tier dividend rights"
  };
  const recordPath = path.join(__dirname, "..", "deployments.json");
  let records = [];
  if (fs.existsSync(recordPath)) {
    records = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  }
  records.push(record);
  fs.writeFileSync(recordPath, JSON.stringify(records, null, 2));
  console.log("\n💾 部署记录已保存到 deployments.json");
}

main().catch(e => {
  console.error("");
  console.error("❌ 部署失败:", e.message);
  process.exit(1);
});
