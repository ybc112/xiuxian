const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const tokenName = process.env.TOKEN_NAME || "Cultivation Token";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "XIU";
  const initialSupply = ethers.parseEther(process.env.INITIAL_SUPPLY || "1000000000");
  const scrollName = process.env.SCROLL_NAME || "Cultivation Scroll";
  const scrollSymbol = process.env.SCROLL_SYMBOL || "SCROLL";

  const Token = await ethers.getContractFactory("CultivationToken");
  const token = await Token.deploy(tokenName, tokenSymbol, initialSupply, deployer.address);
  await token.waitForDeployment();

  const Scroll = await ethers.getContractFactory("CultivationScroll");
  const scroll = await Scroll.deploy(
    await token.getAddress(),
    scrollName,
    scrollSymbol,
    deployer.address
  );
  await scroll.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("Token:", await token.getAddress());
  console.log("Scroll:", await scroll.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
