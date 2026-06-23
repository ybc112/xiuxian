const { ethers } = require("hardhat");

async function main() {
  const SCROLL = "0xED8114064fe2D74ab2cA109c60db1aB9AF46D3E1";
  const scroll = await ethers.getContractAt("CultivationScroll", SCROLL);

  console.log("新 Scroll 状态:");
  console.log("  buybackLpReserve:", ethers.formatEther(await scroll.buybackLpReserve()), "BNB");
  console.log("  totalDividendReceived:", ethers.formatEther(await scroll.totalDividendReceived()), "BNB");
  console.log("  totalClaimed:", ethers.formatEther(await scroll.totalClaimed()), "BNB");
  console.log("  activeScrolls:", (await scroll.activeScrolls()).toString());
  console.log("  router:", await scroll.router());

  const bal = await ethers.provider.getBalance(SCROLL);
  console.log("  BNB余额:", ethers.formatEther(bal), "BNB");
}

main().catch(console.error);
