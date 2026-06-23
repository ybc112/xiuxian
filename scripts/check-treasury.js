const { ethers } = require("hardhat");

async function main() {
  const treasuryAddress = "0x0a417aeaa2700f11c0117f165f768d96dcf0774d";

  // 检查 Treasury owner
  const Treasury = await ethers.getContractAt("CultivationTaxTreasury", treasuryAddress);
  const owner = await Treasury.owner();
  console.log("Treasury 地址:", treasuryAddress);
  console.log("Treasury owner:", owner);

  // 检查当前 signer
  const [signer] = await ethers.getSigners();
  console.log("当前 signer:", signer.address);

  // 检查代码是否存在
  const code = await ethers.provider.getCode(treasuryAddress);
  console.log("合约代码长度:", code.length, "bytes");
  console.log("代码是否存在:", code !== "0x" ? "是" : "否");
}

main().catch(console.error);
