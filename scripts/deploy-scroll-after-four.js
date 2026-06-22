const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const tokenAddress = process.env.TOKEN_ADDRESS;
  const treasuryAddress = process.env.TREASURY_ADDRESS || "";
  const scrollName = process.env.SCROLL_NAME || "Cultivation Scroll";
  const scrollSymbol = process.env.SCROLL_SYMBOL || "SCROLL";
  const owner = process.env.OWNER_ADDRESS || deployer.address;

  if (!ethers.isAddress(tokenAddress || "")) {
    throw new Error("TOKEN_ADDRESS is required and must be a valid Four.meme token address");
  }
  if (!ethers.isAddress(owner)) {
    throw new Error("OWNER_ADDRESS is invalid");
  }
  if (treasuryAddress && !ethers.isAddress(treasuryAddress)) {
    throw new Error("TREASURY_ADDRESS is invalid");
  }

  const Scroll = await ethers.getContractFactory("CultivationScroll");
  const scroll = await Scroll.deploy(tokenAddress, scrollName, scrollSymbol, owner);
  await scroll.waitForDeployment();
  const scrollAddress = await scroll.getAddress();

  console.log("Deployer:", deployer.address);
  console.log("Owner:", owner);
  console.log("FourToken:", tokenAddress);
  console.log("Scroll:", scrollAddress);

  if (treasuryAddress) {
    const Treasury = await ethers.getContractFactory("CultivationTaxTreasury");
    const treasury = Treasury.attach(treasuryAddress);
    const tx = await treasury.setRewardVault(scrollAddress);
    await tx.wait();
    console.log("TaxTreasury:", treasuryAddress);
    console.log("RewardVault configured:", scrollAddress);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
