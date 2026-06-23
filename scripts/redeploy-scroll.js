const { ethers } = require("hardhat");

async function main() {
  const TOKEN = "0x89c4d86fde0c0f013484d0677f27b79722ba6ede";
  const TREASURY = "0xF8DE4847C68378cb9D9d77C616aB755c17aCa11F";
  const ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

  const [deployer] = await ethers.getSigners();
  console.log("部署者:", deployer.address);

  // 1. 部署新 Scroll
  console.log("\n📦 部署新 Scroll...");
  const Scroll = await ethers.getContractFactory("contracts/CultivationScroll.sol:CultivationScroll");
  const scroll = await Scroll.deploy(TOKEN, "Cultivation Scroll", "SCROLL", deployer.address);
  await scroll.waitForDeployment();
  const scrollAddr = await scroll.getAddress();
  console.log("✅ 新 Scroll:", scrollAddr);

  // 2. 配置 Router
  console.log("\n⚙️ 配置 Router...");
  const tx1 = await scroll.setRouter(ROUTER);
  await tx1.wait();
  console.log("✅ Router 配置完成");

  // 3. 绑定 Treasury
  console.log("\n🔗 绑定 Treasury...");
  const Treasury = await ethers.getContractFactory("contracts/CultivationTaxTreasury.sol:CultivationTaxTreasury");
  const treasury = Treasury.attach(TREASURY);
  const tx2 = await treasury.setRewardVault(scrollAddr);
  await tx2.wait();
  console.log("✅ Treasury 已绑定新 Scroll");

  console.log("\n🎉 全部完成!");
  console.log("新 Scroll:", scrollAddr);
}

main().catch(console.error);
