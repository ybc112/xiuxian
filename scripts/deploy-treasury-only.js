const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("部署者:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("余额:", ethers.formatEther(bal), "BNB");

  // 部署 Treasury
  console.log("\n部署 CultivationTaxTreasury...");
  const Treasury = await ethers.getContractFactory("CultivationTaxTreasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury:", treasuryAddress);
  console.log("Owner:", deployer.address);

  console.log("\n=== 完成 ===");
  console.log("请在 Four.meme 发币时，把税收钱包设为:", treasuryAddress);
  console.log("发完币后把新代币地址告诉我，我来部署 Scroll 并绑定。");
}

main().catch(console.error);
