const { ethers } = require("hardhat");

async function main() {
  const parse = ethers.parseEther;

  const Token = await ethers.getContractFactory("CultivationToken");
  const token = await Token.deploy("Test", "TST", parse("20000000"), (await ethers.getSigners())[0].address);
  await token.waitForDeployment();

  const Scroll = await ethers.getContractFactory("CultivationScroll");
  const scroll = await Scroll.deploy(await token.getAddress(), "S", "SC", (await ethers.getSigners())[0].address);
  await scroll.waitForDeployment();

  const [owner, alice, bob] = await ethers.getSigners();
  const tokenAddr = await token.getAddress();
  const scrollAddr = await scroll.getAddress();

  // 给 alice 和 bob 转 token
  await token.transfer(alice.address, parse("2000000"));
  await token.transfer(bob.address, parse("2000000"));

  console.log("========== 场景1: 只有人注册，没人升级 ==========\n");

  // Alice 注册 tier1
  await scroll.connect(alice).register();
  console.log("Alice 注册 tier1");

  // 存入 10 BNB 分红
  await owner.sendTransaction({ to: scrollAddr, value: parse("10") });
  console.log("存入 10 BNB");

  // 检查分配
  const div1 = await scroll.totalDividendReceived();
  console.log("分红池:", ethers.formatEther(div1), "BNB");

  // 各 tier unallocated
  for (let t = 1; t <= 5; t++) {
    const supply = await scroll.tierSupply(t);
    const unalloc = await scroll.unallocatedTierRewards(t);
    console.log(`  Tier ${t}: supply=${supply}, unallocated=${ethers.formatEther(unalloc)} BNB`);
  }

  const alicePending1 = await scroll.pendingReward(alice.address);
  console.log("\nAlice 待领取:", ethers.formatEther(alicePending1), "BNB");
  console.log("Alice 应得 (tier1 30%):", ethers.formatEther(parse("8") * 3000n / 10000n), "BNB");
  console.log("Tier2-5 未分配:", ethers.formatEther(parse("8") * 7000n / 10000n), "BNB ← 这70%锁死了!");

  console.log("\n========== 场景2: 第一个人升级，独吞该tier所有累积 ==========\n");

  // 再存入 10 BNB
  await owner.sendTransaction({ to: scrollAddr, value: parse("10") });
  console.log("再存入 10 BNB");

  // Alice 升级到 tier2
  await token.connect(alice).approve(scrollAddr, parse("50000"));
  await scroll.connect(alice).upgrade();
  console.log("Alice 升级到 tier2");

  // 检查 tier2 unallocated
  const unalloc2 = await scroll.unallocatedTierRewards(2);
  console.log("Tier2 unallocated (升级后):", ethers.formatEther(unalloc2), "BNB");

  const alicePending2 = await scroll.pendingReward(alice.address);
  console.log("Alice 待领取:", ethers.formatEther(alicePending2), "BNB");

  // Bob 也注册 tier1
  await scroll.connect(bob).register();
  console.log("\nBob 注册 tier1");

  // Bob 升级到 tier2
  await token.connect(bob).approve(scrollAddr, parse("50000"));
  await scroll.connect(bob).upgrade();
  console.log("Bob 升级到 tier2");

  // 再存入 10 BNB
  await owner.sendTransaction({ to: scrollAddr, value: parse("10") });
  console.log("再存入 10 BNB");

  const alicePending3 = await scroll.pendingReward(alice.address);
  const bobPending3 = await scroll.pendingReward(bob.address);
  console.log("\nAlice 待领取:", ethers.formatEther(alicePending3), "BNB");
  console.log("Bob 待领取:", ethers.formatEther(bobPending3), "BNB");

  console.log("\n========== 问题总结 ==========\n");
  console.log("问题1: 只有tier1有人时，tier2-5的70%分红进入unallocated，无法领取");
  console.log("问题2: 第一个升级到某tier的人，独吞该tier所有累积的unallocated奖励");
  console.log("问题3: 应该把空tier的份额重新分配给有人的tier，100%分配出去");
}

main().catch(console.error);
