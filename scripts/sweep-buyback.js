const { ethers } = require("hardhat");

async function main() {
  const SCROLL = "0xED8114064fe2D74ab2cA109c60db1aB9AF46D3E1";
  const scroll = await ethers.getContractAt("CultivationScroll", SCROLL);

  const reserve = await scroll.buybackLpReserve();
  console.log("buybackLpReserve:", ethers.formatEther(reserve), "BNB");

  if (reserve == 0n) {
    console.log("没有储备金");
    return;
  }

  console.log("\n执行 sweepBuybackToDividends...");
  const tx = await scroll.sweepBuybackToDividends();
  const receipt = await tx.wait();
  console.log("✅ 成功! gasUsed:", receipt.gasUsed.toString());

  const newReserve = await scroll.buybackLpReserve();
  const newDividend = await scroll.totalDividendReceived();
  console.log("\n执行后:");
  console.log("  buybackLpReserve:", ethers.formatEther(newReserve), "BNB");
  console.log("  totalDividendReceived:", ethers.formatEther(newDividend), "BNB");
}

main().catch(e => { console.error("❌ 失败:", e.message); process.exit(1); });
