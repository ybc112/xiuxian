// scripts/full-deploy.js
// 一体化部署脚本 - 从 Four.meme 代币地址到完整分红系统
// 使用方法: node scripts/full-deploy.js --token <TOKEN_ADDRESS> --treasury <TREASURY_ADDRESS> --network bsc

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg, i) => {
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = process.argv[i + 3];
      args[key] = value;
    }
  });
  return args;
}

async function main() {
  const args = parseArgs();
  const network = args.network || "bsc";

  console.log("=".repeat(60));
  console.log("  修仙卷轴一体化部署脚本");
  console.log("=".repeat(60));
  console.log("");

  // ========== 参数加载 ==========
  const TOKEN_ADDRESS = args.token || process.env.TOKEN_ADDRESS;
  const TREASURY_ADDRESS = args.treasury || process.env.TREASURY_ADDRESS;
  const SCROLL_NAME = process.env.SCROLL_NAME || "Cultivation Scroll";
  const SCROLL_SYMBOL = process.env.SCROLL_SYMBOL || "SCROLL";
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS || "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap BSC

  if (!TOKEN_ADDRESS || !ethers.isAddress(TOKEN_ADDRESS)) {
    throw new Error("❌ 请提供有效的 TOKEN_ADDRESS (--token 0x... 或环境变量)");
  }

  console.log("📋 配置参数:");
  console.log(`  网络: ${network}`);
  console.log(`  代币地址: ${TOKEN_ADDRESS}`);
  console.log(`  金库地址: ${TREASURY_ADDRESS || "未提供 (待部署)"}`);
  console.log(`  PancakeRouter: ${ROUTER_ADDRESS}`);
  console.log("");

  // ========== 部署器 ==========
  const [deployer] = await ethers.getSigners();
  console.log(`🔑 部署者: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 余额: ${ethers.formatEther(balance)} BNB`);
  console.log("");

  // ========== 第一步: 部署 Scroll 合约 ==========
  console.log("📦 步骤 1: 部署 CultivationScroll 合约...");
  const Scroll = await ethers.getContractFactory("CultivationScroll");
  const scroll = await Scroll.deploy(
    TOKEN_ADDRESS,
    SCROLL_NAME,
    SCROLL_SYMBOL,
    deployer.address
  );
  await scroll.waitForDeployment();
  const scrollAddress = await scroll.getAddress();
  console.log(`  ✅ Scroll 部署成功: ${scrollAddress}`);
  console.log("");

  // ========== 第二步: 配置 Scroll (Pancake Router) ==========
  console.log("⚙️  步骤 2: 配置 PancakeSwap Router...");
  const setRouterTx = await scroll.setRouter(ROUTER_ADDRESS);
  await setRouterTx.wait();
  console.log(`  ✅ Router 配置成功: ${ROUTER_ADDRESS}`);
  console.log("");

  // ========== 第三步: 绑定 Treasury ==========
  if (TREASURY_ADDRESS && ethers.isAddress(TREASURY_ADDRESS)) {
    console.log("🔗 步骤 3: 绑定 Treasury.setRewardVault...");
    const Treasury = await ethers.getContractFactory("CultivationTaxTreasury");
    const treasury = Treasury.attach(TREASURY_ADDRESS);

    // 检查 owner 是否匹配
    const treasuryOwner = await treasury.owner();
    if (treasuryOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log(`  ⚠️ 警告: Treasury owner (${treasuryOwner}) 与当前钱包不匹配!`);
      console.log(`  ⚠️ 需要 owner 操作 setRewardVault`);
      console.log(`  📝 请 owner 手动调用:`);
      console.log(`     Treasury.setRewardVault("${scrollAddress}")`);
    } else {
      const tx = await treasury.setRewardVault(scrollAddress);
      await tx.wait();
      console.log(`  ✅ Treasury 已绑定 Scroll`);
    }
    console.log("");
  } else {
    console.log("⏭️  步骤 3: 跳过 (未提供 Treasury 地址)");
    console.log("");
  }

  // ========== 第四步: 验证合约 ==========
  console.log("🔍 步骤 4: 验证合约源码...");
  try {
    await run("verify:verify", {
      address: scrollAddress,
      constructorArguments: [TOKEN_ADDRESS, SCROLL_NAME, SCROLL_SYMBOL, deployer.address],
    });
    console.log(`  ✅ Scroll 已开源`);
  } catch (e) {
    if (e.message.includes("already verified")) {
      console.log(`  ℹ️ Scroll 已经验证过`);
    } else {
      console.log(`  ⚠️ 验证失败: ${e.message}`);
    }
  }
  console.log("");

  // ========== 输出最终信息 ==========
  console.log("=".repeat(60));
  console.log("  🎉 部署完成!");
  console.log("=".repeat(60));
  console.log("");
  console.log("📝 部署结果:");
  console.log(`  Token:    ${TOKEN_ADDRESS}`);
  console.log(`  Scroll:   ${scrollAddress}`);
  console.log(`  Treasury: ${TREASURY_ADDRESS || "未提供"}`);
  console.log("");
  console.log("📝 前端配置 (写入 src/App.jsx):");
  console.log(`  tokenAddress:  "${TOKEN_ADDRESS}"`);
  console.log(`  scrollAddress: "${scrollAddress}"`);
  console.log("");
  console.log("📝 BscScan 链接:");
  console.log(`  Token:    https://bscscan.com/address/${TOKEN_ADDRESS}`);
  console.log(`  Scroll:   https://bscscan.com/address/${scrollAddress}`);
  if (TREASURY_ADDRESS) {
    console.log(`  Treasury: https://bscscan.com/address/${TREASURY_ADDRESS}`);
  }
  console.log("");

  // 保存到文件
  const deploymentInfo = {
    network,
    timestamp: new Date().toISOString(),
    token: TOKEN_ADDRESS,
    scroll: scrollAddress,
    treasury: TREASURY_ADDRESS,
    owner: deployer.address,
    router: ROUTER_ADDRESS
  };
  const outputFile = path.join(__dirname, "..", "deployment-info.json");
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 部署信息已保存到: ${outputFile}`);
}

main().catch((error) => {
  console.error("");
  console.error("❌ 部署失败:");
  console.error(error.message);
  process.exit(1);
});
