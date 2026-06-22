export const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const SCROLL_ABI = [
  "function register()",
  "function upgrade()",
  "function claim()",
  "function validateHolding(address user) returns (bool)",
  "function scrollOf(address user) view returns (uint256)",
  "function tierOf(address user) view returns (uint8)",
  "function pendingReward(address user) view returns (uint256)",
  "function minHoldings(uint256 tier) view returns (uint256)",
  "function upgradeBurnCosts(uint256 tier) view returns (uint256)",
  "function tierSupply(uint256 tier) view returns (uint256)",
  "function tierWeightBps(uint8 tier) view returns (uint16)",
  "function unallocatedTierRewards(uint256 tier) view returns (uint256)",
  "function totalDividendReceived() view returns (uint256)",
  "function totalClaimed() view returns (uint256)",
  "function buybackLpReserve() view returns (uint256)",
  "function activeScrolls() view returns (uint256)",
];
