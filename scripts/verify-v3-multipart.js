const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const BSCSCAN_API_KEY = "Y9SWA2SK9A2MUEBHGVR5Q4TSHQ3U4R5YES";

// 收集所有源文件
function getAllSoliditySources() {
  const contractsDir = path.join(__dirname, "..", "contracts");
  const sources = {};

  function walkDir(dir, prefix = "") {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, prefix + file + "/");
      } else if (file.endsWith(".sol")) {
        const relPath = prefix + file;
        sources[relPath] = { content: fs.readFileSync(fullPath, "utf8") };
      }
    }
  }

  walkDir(contractsDir);
  return sources;
}

// 获取 openzeppelin 源文件（完整递归收集）
function getOpenzeppelinSources() {
  const ozContractsDir = path.join(__dirname, "..", "node_modules", "@openzeppelin", "contracts");
  const sources = {};

  if (!fs.existsSync(ozContractsDir)) return sources;

  function walkDir(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, prefix + file + "/");
      } else if (file.endsWith(".sol")) {
        const relPath = prefix + file;
        sources["@openzeppelin/contracts/" + relPath] = { content: fs.readFileSync(fullPath, "utf8") };
      }
    }
  }

  walkDir(ozContractsDir);
  return sources;
}

async function verifyMultiPart(contractName, contractAddress, constructorArgs) {
  console.log(`\n验证 ${contractName} @ ${contractAddress}...`);

  const localSources = getAllSoliditySources();
  const ozSources = getOpenzeppelinSources();
  const allSources = { ...localSources, ...ozSources };

  console.log(`  收集了 ${Object.keys(allSources).length} 个源文件`);

  const { ethers: hreEthers } = require("hardhat");
  let iface;
  if (contractName === "CultivationScroll") {
    iface = new hreEthers.Interface(["constructor(address token_, string memory name_, string memory symbol_, address owner_)"]);
  } else {
    iface = new hreEthers.Interface(["constructor(address owner_)"]);
  }
  const encodedArgs = iface.encodeDeploy(constructorArgs).slice(2);

  // Build standard JSON input
  const settings = {
    viaIR: true,
    evmVersion: "paris",
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]
      }
    }
  };

  const solcInput = {
    language: "Solidity",
    sources: allSources,
    settings: settings
  };

  const data = new URLSearchParams();
  data.append("apikey", BSCSCAN_API_KEY);
  data.append("chainid", "56");
  data.append("module", "contract");
  data.append("action", "verifysourcecode");
  data.append("contractaddress", contractAddress);
  data.append("sourceCode", JSON.stringify(solcInput));
  data.append("codeformat", "solidity-standard-json-input");
  data.append("contractname", `contracts/${contractName}.sol:${contractName}`);
  data.append("compilerversion", "v0.8.24+commit.e11b9ed9");
  data.append("optimizationUsed", "1");
  data.append("runs", "200");
  data.append("constructorArguements", encodedArgs);
  data.append("evmversion", "paris");

  try {
    const response = await axios.post("https://api.etherscan.io/v2/api?chainid=56", data.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 60000
    });

    console.log(`  状态: ${response.data.status}`);
    console.log(`  消息: ${response.data.message}`);
    const result = String(response.data.result);
    console.log(`  结果: ${result.slice(0, 100)}`);

    if (response.data.status === "1" || result.includes("already verified")) {
      console.log(`  ✅ ${contractName} 验证提交成功`);

      // 等待验证结果
      if (!result.includes("already verified")) {
        console.log("  等待验证结果...");
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 10000));
          const checkData = new URLSearchParams();
          checkData.append("apikey", BSCSCAN_API_KEY);
          checkData.append("chainid", "56");
          checkData.append("module", "contract");
          checkData.append("action", "checkverifystatus");
          checkData.append("guid", result);
          try {
            const checkResp = await axios.post("https://api.etherscan.io/v2/api?chainid=56", checkData.toString(), {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              timeout: 30000
            });
            const status = String(checkResp.data.result);
            console.log(`  检查 ${i+1}: ${checkResp.data.message} - ${status.slice(0, 80)}`);
            if (status.includes("Pass") || status.includes("Already Verified")) {
              console.log(`  ✅ ${contractName} 验证通过!`);
              return true;
            }
            if (status.includes("Fail")) {
              console.log(`  ❌ 验证失败: ${status.slice(0, 200)}`);
              return false;
            }
          } catch (e) {
            console.log(`  检查 ${i+1}: 网络错误，继续等待...`);
          }
        }
      } else {
        console.log(`  ✅ ${contractName} 已验证`);
      }
      return true;
    } else {
      console.log(`  ❌ 验证失败`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ 请求失败: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=== BscScan V2 Multi-part 合约验证 ===");

  await verifyMultiPart(
    "CultivationScroll",
    "0x261ca0Ef0aDd811Bc7Fd6669A104A402C6Dcfee1",
    ["0x89c4d86fde0c0f013484d0677f27b79722ba6ede", "Cultivation Scroll", "SCROLL", "0x9B0c7994F4289Aa247d06A96C4447EB36c13CfBb"]
  );

  await new Promise(r => setTimeout(r, 3000));

  await verifyMultiPart(
    "CultivationTaxTreasury",
    "0xF10A395eB8Cdb51c88Ca847B7c0427b764d94307",
    ["0x9B0c7994F4289Aa247d06A96C4447EB36c13CfBb"]
  );

  console.log("\n=== 完成 ===");
}

main().catch(console.error);
