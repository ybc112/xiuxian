const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const owner = process.env.OWNER_ADDRESS || deployer.address;

  if (!ethers.isAddress(owner)) {
    throw new Error("OWNER_ADDRESS is invalid");
  }

  const Treasury = await ethers.getContractFactory("CultivationTaxTreasury");
  const treasury = await Treasury.deploy(owner);
  await treasury.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("Owner:", owner);
  console.log("TaxTreasury:", await treasury.getAddress());
  console.log("Use TaxTreasury as the Four.meme royalty/tax receiver wallet.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
