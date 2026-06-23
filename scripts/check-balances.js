const { ethers } = require("hardhat");

async function main() {
  const addresses = {
    "Key1 (旧Scroll owner)": "0xB488AcD11351ce8CD516e87EbE1782D73699F170",
    "Key2": "0x9B0c7994F4289Aa247d06A96C4447EB36c13CfBb",
    "Key3 (tokenId1 owner)": "0x7d8A656bE9c3e311ea53d67411028cb3F750cBcE",
    "Treasury owner (未知)": "0xc324Fa989CA3d53641822E9514b97b5Dcdce1fcB"
  };

  const TOKEN = "0x89c4d86fde0c0f013484d0677f27b79722ba6ede";
  const token = await ethers.getContractAt("IERC20", TOKEN);

  for (const [name, addr] of Object.entries(addresses)) {
    const bnb = await ethers.provider.getBalance(addr);
    const tok = await token.balanceOf(addr);
    console.log(`${name}:`);
    console.log(`  地址: ${addr}`);
    console.log(`  BNB: ${ethers.formatEther(bnb)}`);
    console.log(`  Token: ${ethers.formatEther(tok)}`);
    console.log("");
  }
}

main().catch(console.error);
