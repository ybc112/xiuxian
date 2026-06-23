const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const TOKEN_ADDRESS = "0xcf71ed2806aa0eee52cc72c3699dc3af6c26d5da";
const TREASURY_ADDRESS = "0xbe0CF9094ce7744a887217C4B5f62411c7D55EE6";
const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const APP_JSX_PATH = path.join(__dirname, "..", "src", "App.jsx");
const ENV_PATH = path.join(__dirname, "..", ".env");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("部署者:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("余额:", ethers.formatEther(bal), "BNB");

  // Step 1: 部署 Scroll
  console.log("\n📦 Step 1/4: 部署 CultivationScroll...");
  const Scroll = await ethers.getContractFactory("CultivationScroll");
  const scroll = await Scroll.deploy(TOKEN_ADDRESS, "Cultivation Scroll", "SCROLL", deployer.address);
  await scroll.waitForDeployment();
  const scrollAddress = await scroll.getAddress();
  console.log("  ✅ Scroll:", scrollAddress);

  // Step 2: 配置 Router
  console.log("\n⚙️  Step 2/4: 配置 PancakeSwap Router...");
  const setRouterTx = await scroll.setRouter(ROUTER_ADDRESS);
  await setRouterTx.wait();
  console.log("  ✅ Router:", ROUTER_ADDRESS);

  // Step 3: 绑定 Treasury → Scroll
  console.log("\n🔗 Step 3/4: 绑定 Treasury.setRewardVault → Scroll...");
  const treasury = await ethers.getContractAt("CultivationTaxTreasury", TREASURY_ADDRESS);
  const bindTx = await treasury.setRewardVault(scrollAddress);
  await bindTx.wait();
  const vault = await treasury.rewardVault();
  console.log("  ✅ rewardVault:", vault);

  // Step 4: 更新 .env 和 App.jsx
  console.log("\n🎨 Step 4/4: 更新配置文件...");
  let envContent = fs.readFileSync(ENV_PATH, "utf8");
  envContent = envContent.replace(/TOKEN_ADDRESS=.*/, `TOKEN_ADDRESS=${TOKEN_ADDRESS}`);
  envContent = envContent.replace(/TREASURY_ADDRESS=.*/, `TREASURY_ADDRESS=${TREASURY_ADDRESS}`);
  envContent = envContent.replace(/VITE_TOKEN_ADDRESS=.*/, `VITE_TOKEN_ADDRESS=${TOKEN_ADDRESS}`);
  envContent = envContent.replace(/VITE_SCROLL_ADDRESS=.*/, `VITE_SCROLL_ADDRESS=${scrollAddress}`);
  if (envContent.includes("VITE_TREASURY_ADDRESS=")) {
    envContent = envContent.replace(/VITE_TREASURY_ADDRESS=.*/, `VITE_TREASURY_ADDRESS=${TREASURY_ADDRESS}`);
  } else {
    envContent += `\nVITE_TREASURY_ADDRESS=${TREASURY_ADDRESS}`;
  }
  fs.writeFileSync(ENV_PATH, envContent, "utf8");
  console.log("  ✅ .env 已更新");

  let appCode = fs.readFileSync(APP_JSX_PATH, "utf8");
  appCode = appCode.replace(/tokenAddress:\s*"[^"]*"/, `tokenAddress: "${TOKEN_ADDRESS}"`);
  appCode = appCode.replace(/scrollAddress:\s*"[^"]*"/, `scrollAddress: "${scrollAddress}"`);
  fs.writeFileSync(APP_JSX_PATH, appCode, "utf8");
  console.log("  ✅ App.jsx 已更新");

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                    🎉 部署完成!                      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Token:    ${TOKEN_ADDRESS}`);
  console.log(`  Scroll:   ${scrollAddress}`);
  console.log(`  Treasury: ${TREASURY_ADDRESS}`);
  console.log(`  Owner:    ${deployer.address}`);
  console.log("\n🔗 BscScan:");
  console.log(`  Scroll:   https://bscscan.com/address/${scrollAddress}`);
  console.log(`  Treasury: https://bscscan.com/address/${TREASURY_ADDRESS}`);

  // 保存部署记录
  const recordPath = path.join(__dirname, "..", "deployments.json");
  let records = [];
  if (fs.existsSync(recordPath)) records = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  records.push({
    version: "V3-Latest",
    timestamp: new Date().toISOString(),
    token: TOKEN_ADDRESS,
    scroll: scrollAddress,
    treasury: TREASURY_ADDRESS,
    owner: deployer.address,
    router: ROUTER_ADDRESS
  });
  fs.writeFileSync(recordPath, JSON.stringify(records, null, 2));
}

main().catch(e => { console.error("❌ 失败:", e.message); process.exit(1); });
