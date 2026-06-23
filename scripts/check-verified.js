const axios = require("axios");

const BSCSCAN_API_KEY = "Y9SWA2SK9A2MUEBHGVR5Q4TSHQ3U4R5YES";
const BASE_URL = "https://api.etherscan.io/v2/api";
const CHAIN_ID = 56;

// 检查合约是否已验证
async function checkVerified(address) {
  const url = `${BASE_URL}?chainid=${CHAIN_ID}`;
  const data = new URLSearchParams();
  data.append("chainid", CHAIN_ID);
  data.append("apikey", BSCSCAN_API_KEY);
  data.append("module", "contract");
  data.append("action", "getabi");
  data.append("address", address);

  const r = await axios.post(url, data.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  if (r.data.status === "1") {
    console.log(`✅ ${address} 已验证!`);
    return true;
  } else {
    console.log(`❌ ${address} 未验证: ${r.data.result}`);
    return false;
  }
}

(async () => {
  console.log("检查验证状态...\n");
  await checkVerified("0xDbF26770983a41c8e4e126915D35f853e7A0CF90");
  await checkVerified("0x0a417aeaa2700f11c0117f165f768d96dcf0774d");
  await checkVerified("0xF8DE4847C68378cb9D9d77C616aB755c17aCa11F");
})();
