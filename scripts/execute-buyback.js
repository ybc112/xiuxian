const { ethers } = require("hardhat");

async function main() {
  const SCROLL = "0xED8114064fe2D74ab2cA109c60db1aB9AF46D3E1";
  const scroll = await ethers.getContractAt("CultivationScroll", SCROLL);

  const reserve = await scroll.buybackLpReserve();
  console.log("buybackLpReserve:", ethers.formatEther(reserve), "BNB");

  if (reserve == 0n) {
    console.log("没有储备金，无法执行");
    return;
  }

  // 用全部储备金执行 buyback + add liquidity
  const amount = reserve;
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

  console.log("\n执行 executeBuybackAndAddLiquidity...");
  console.log("  金额:", ethers.formatEther(amount), "BNB");
  console.log("  deadline:", deadline);

  const tx = await scroll.executeBuybackAndAddLiquidity(
    amount,
    0,  // minTokensOut - 设为0避免滑点问题
    0,  // minTokenLiquidity
    0,  // minBNBLiquidity
    deadline
  );

  console.log("  tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("  ✅ 执行成功! gasUsed:", receipt.gasUsed.toString());

  // 检查结果
  const newReserve = await scroll.buybackLpReserve();
  console.log("\n执行后 buybackLpReserve:", ethers.formatEther(newReserve), "BNB");
}

main().catch(e => { console.error("❌ 失败:", e.message); process.exit(1); });
