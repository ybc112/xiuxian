const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const BSCSCAN_API_KEY = "Y9SWA2SK9A2MUEBHGVR5Q4TSHQ3U4R5YES";

const contracts = [
  {
    name: "CultivationScroll",
    address: "0x261ca0Ef0aDd811Bc7Fd6669A104A402C6Dcfee1",
    constructorArgs: [
      "0x89c4d86fde0c0f013484d0677f27b79722ba6ede",
      "Cultivation Scroll",
      "SCROLL",
      "0x9B0c7994F4289Aa247d06A96C4447EB36c13CfBb"
    ],
    abi: "constructor(address token_, string memory name_, string memory symbol_, address owner_)"
  },
  {
    name: "CultivationTaxTreasury",
    address: "0xF10A395eB8Cdb51c88Ca847B7c0427b764d94307",
    constructorArgs: [
      "0x9B0c7994F4289Aa247d06A96C4447EB36c13CfBb"
    ],
    abi: "constructor(address owner_)"
  }
];

async function verifyContract(contract) {
  const { name, address, constructorArgs, abi } = contract;
  console.log(`\n验证 ${name} @ ${address}...`);

  const contractPath = path.join(__dirname, "..", "contracts", `${name}.sol`);
  if (!fs.existsSync(contractPath)) {
    console.log(`  ❌ 未找到: ${contractPath}`);
    return false;
  }
  const sourceCode = fs.readFileSync(contractPath, "utf8");

  const iface = new ethers.Interface([abi]);
  const encodedArgs = iface.encodeDeploy(constructorArgs).slice(2);
  console.log(`  编码参数: ${encodedArgs.slice(0, 40)}...`);

  const data = new URLSearchParams();
  data.append("apikey", BSCSCAN_API_KEY);
  data.append("chainid", "56");
  data.append("module", "contract");
  data.append("action", "verifysourcecode");
  data.append("contractaddress", address);
  data.append("sourceCode", sourceCode);
  data.append("codeformat", "solidity-single-file");
  data.append("contractname", `contracts/${name}.sol:${name}`);
  data.append("compilerversion", "v0.8.24+commit.e11b9ed9");
  data.append("optimizationUsed", "1");
  data.append("runs", "200");
  data.append("constructorArguements", encodedArgs);
  data.append("evmversion", "paris");

  try {
    const response = await axios.post("https://api.etherscan.io/v2/api?chainid=56", data.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    console.log(`  状态: ${response.data.status}`);
    console.log(`  消息: ${response.data.message}`);
    const result = String(response.data.result);
    console.log(`  结果: ${result.slice(0, 100)}`);

    if (response.data.status === "1") {
      console.log(`  ✅ ${name} 验证提交成功! GUID: ${result}`);
      // 等待验证结果
      console.log("  等待验证结果...");
      await new Promise(r => setTimeout(r, 15000));
      const checkData = new URLSearchParams();
      checkData.append("apikey", BSCSCAN_API_KEY);
      checkData.append("chainid", "56");
      checkData.append("module", "contract");
      checkData.append("action", "checkverifystatus");
      checkData.append("guid", result);
      const checkResp = await axios.post("https://api.etherscan.io/v2/api?chainid=56", checkData.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      console.log(`  验证结果: ${checkResp.data.message} - ${String(checkResp.data.result).slice(0, 80)}`);
      return true;
    } else if (result.includes("already verified")) {
      console.log(`  ℹ️ ${name} 已验证`);
      return true;
    } else {
      console.log(`  ⚠️ ${name} 验证失败`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ 请求失败: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=== BscScan V2 合约验证 ===");

  for (const contract of contracts) {
    await verifyContract(contract);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log("\n=== 完成 ===");
}

main().catch(console.error);
