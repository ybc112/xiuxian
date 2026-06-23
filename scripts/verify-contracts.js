const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BSCSCAN_API_KEY = "Y9SWA2SK9A2MUEBHGVR5Q4TSHQ3U4R5YES";

// 合约配置
const contracts = [
  {
    name: "CultivationScroll",
    address: "0xDbF26770983a41c8e4e126915D35f853e7A0CF90",
    constructorArgs: "00000000000000000000000089c4d86fde0c0f013484d0677f27b79722ba6ede000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000b488acd11351ce8cd516e87ebe1782d73699f1700000000000000000000000043756c69766174696f6e205363726f6c6c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000065343524f4c4c000000000000000000000000000000000000000000000000000000"
  },
  {
    name: "CultivationTaxTreasury",
    address: "0x0a417aeaa2700f11c0117f165f768d96dcf0774d",
    constructorArgs: "000000000000000000000000c324fa989ca3d53641822e9514b97b5dcdce1fcb"
  }
];

async function verifyContract(contract) {
  const { name, address, constructorArgs } = contract;
  console.log(`\n正在验证 ${name}...`);
  console.log(`地址: ${address}`);

  // 读取源代码
  const contractPath = path.join(__dirname, "..", "contracts", `${name}.sol`);

  if (!fs.existsSync(contractPath)) {
    console.log(`❌ 未找到合约文件: ${contractPath}`);
    return false;
  }

  const sourceCode = fs.readFileSync(contractPath, "utf8");

  // BSCScan V1 API (仍然可用，但需要正确的端点)
  const url = `https://api.bscscan.com/api?apikey=${BSCSCAN_API_KEY}`;

  const data = new URLSearchParams();
  data.append("module", "contract");
  data.append("action", "verifysourcecode");
  data.append("contractaddress", address);
  data.append("sourceCode", sourceCode);
  data.append("codeformat", "solidity-single-file");
  data.append("contractname", `contracts/${name}.sol:${name}`);
  data.append("compilerversion", "v0.8.24");
  data.append("optimizationUsed", "1");
  data.append("runs", "200");
  data.append("constructorArguements", constructorArgs);

  try {
    const response = await axios.post(url, data.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    console.log(`状态: ${response.data.status}`);
    console.log(`消息: ${response.data.message}`);
    console.log(`结果: ${response.data.result}`);

    if (response.data.status === "1") {
      console.log(`✅ ${name} 验证提交成功!`);
      return true;
    } else if (response.data.result.includes("Contract source code already verified")) {
      console.log(`ℹ️ ${name} 已经验证过了`);
      return true;
    } else {
      console.log(`⚠️ ${name} 验证需要手动处理`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} 请求失败: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=== BSCScan 合约验证 ===\n");

  let allSuccess = true;
  for (const contract of contracts) {
    const success = await verifyContract(contract);
    if (!success) allSuccess = false;
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\n=== 完成 ===");

  if (!allSuccess) {
    console.log("\n请手动验证:");
    console.log("1. 打开 BscScan");
    console.log("2. 搜索合约地址");
    console.log("3. 点击 'Contract' -> 'Verify & Publish'");
    console.log("4. 选择 'Solidity (Single File)'");
    console.log("5. 配置:");
    console.log("   - Compiler: v0.8.24");
    console.log("   - Optimization: Yes (200 runs)");
    console.log("   - Contract Name: contracts/<Name>.sol:<Name>");
  }

  console.log("\n合约链接:");
  console.log("- Scroll: https://bscscan.com/address/0xDbF26770983a41c8e4e126915D35f853e7A0CF90");
  console.log("- Treasury: https://bscscan.com/address/0x0a417aeaa2700f11c0117f165f768d96dcf0774d");
}

main().catch(console.error);
