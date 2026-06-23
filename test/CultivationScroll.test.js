const { expect } = require("chai");
const { ethers } = require("hardhat");

const parse = ethers.parseEther;

async function expectRevert(promise) {
  let reverted = false;
  try {
    await promise;
  } catch (error) {
    reverted = true;
  }
  expect(reverted).to.equal(true);
}

describe("CultivationScroll", function () {
  let owner;
  let alice;
  let bob;
  let carol;
  let lpReceiver;
  let token;
  let scroll;

  beforeEach(async function () {
    [owner, alice, bob, carol, lpReceiver] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("CultivationToken");
    token = await Token.deploy(
      "Cultivation Token",
      "XIU",
      parse("20000000"),
      owner.address
    );

    const Scroll = await ethers.getContractFactory("CultivationScroll");
    scroll = await Scroll.deploy(
      await token.getAddress(),
      "Cultivation Scroll",
      "SCROLL",
      owner.address
    );

    await token.transfer(alice.address, parse("500000"));
    await token.transfer(bob.address, parse("2000000"));
    await token.transfer(carol.address, parse("4000000"));
  });

  it("registers a tier-1 scroll when the holder meets the token threshold", async function () {
    await scroll.connect(alice).register();

    expect(await scroll.scrollOf(alice.address)).to.equal(1n);
    expect(await scroll.tierOf(alice.address)).to.equal(1n);
    expect(await scroll.tierSupply(1)).to.equal(1n);
    expect(await scroll.activeScrolls()).to.equal(1n);
  });

  it("rejects registration below the tier-1 threshold and blocks duplicate scrolls", async function () {
    await token.transfer(lpReceiver.address, parse("99999"));

    await expectRevert(scroll.connect(lpReceiver).register());

    await scroll.connect(alice).register();
    await expectRevert(scroll.connect(alice).register());
  });

  it("splits received BNB into 80% dividends and 20% buyback LP reserve", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    expect(await scroll.buybackLpReserve()).to.equal(parse("2"));
    expect(await scroll.totalDividendReceived()).to.equal(parse("8"));
    expect(await scroll.pendingReward(alice.address)).to.equal(parse("2.4"));
  });

  it("splits tier rewards equally between holders in the same tier", async function () {
    await scroll.connect(alice).register();
    await scroll.connect(bob).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    expect(await scroll.pendingReward(alice.address)).to.equal(parse("1.2"));
    expect(await scroll.pendingReward(bob.address)).to.equal(parse("1.2"));
  });

  it("keeps empty tier rewards unallocated and activates them when the tier opens", async function () {
    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    expect(await scroll.unallocatedTierRewards(1)).to.equal(parse("2.4"));

    await scroll.connect(alice).register();

    expect(await scroll.unallocatedTierRewards(1)).to.equal(0n);
    expect(await scroll.pendingReward(alice.address)).to.equal(parse("2.4"));
  });

  it("sends the required token amount to the burn address when upgrading tiers", async function () {
    await scroll.connect(alice).register();
    await token.connect(alice).approve(await scroll.getAddress(), parse("50000"));
    const burnAddress = await scroll.BURN_ADDRESS();
    const burnBalanceBefore = await token.balanceOf(burnAddress);

    await scroll.connect(alice).upgrade();

    expect(await scroll.tierOf(alice.address)).to.equal(2n);
    expect(await scroll.tierSupply(1)).to.equal(1n); // user keeps tier1 dividend rights
    expect(await scroll.tierSupply(2)).to.equal(1n);
    expect(await token.balanceOf(alice.address)).to.equal(parse("450000"));
    expect(await token.balanceOf(burnAddress)).to.equal(burnBalanceBefore + parse("50000"));
  });

  it("requires enough balance to remain above the next tier threshold after burn", async function () {
    await token.transfer(lpReceiver.address, parse("200000"));
    await scroll.connect(lpReceiver).register();
    await token.connect(lpReceiver).approve(await scroll.getAddress(), parse("50000"));

    await expectRevert(scroll.connect(lpReceiver).upgrade());

    expect(await scroll.tierOf(lpReceiver.address)).to.equal(1n);
    expect(await token.balanceOf(lpReceiver.address)).to.equal(parse("200000"));
  });

  it("preserves already-earned rewards when upgrading into a new tier", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });
    expect(await scroll.pendingReward(alice.address)).to.equal(parse("2.4"));

    await token.connect(alice).approve(await scroll.getAddress(), parse("50000"));
    await scroll.connect(alice).upgrade();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    // After upgrade to tier2, alice earns from both tier1 and tier2
    // tier1: 8 * 30% = 2.4 (new) + 2.4 (stored) = 4.8 from tier1
    // tier2: 8 * 15% = 1.2 from tier2
    // total = 6.0
    expect(await scroll.pendingReward(alice.address)).to.equal(parse("6.0"));
  });

  it("reaches tier 5 with enough balance and rejects upgrades past max tier", async function () {
    await scroll.connect(carol).register();
    await token.connect(carol).approve(await scroll.getAddress(), parse("1600000"));

    await scroll.connect(carol).upgrade();
    await scroll.connect(carol).upgrade();
    await scroll.connect(carol).upgrade();
    await scroll.connect(carol).upgrade();

    expect(await scroll.tierOf(carol.address)).to.equal(5n);
    expect(await token.balanceOf(carol.address)).to.equal(parse("2400000"));
    await expectRevert(scroll.connect(carol).upgrade());
  });

  it("redistributes forfeited rewards when an under-threshold scroll is invalidated", async function () {
    await scroll.connect(alice).register();
    await scroll.connect(bob).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    expect(await scroll.pendingReward(alice.address)).to.equal(parse("1.2"));
    expect(await scroll.pendingReward(bob.address)).to.equal(parse("1.2"));

    await token.connect(alice).transfer(owner.address, parse("401000"));
    await scroll.connect(alice).claim();

    expect(await scroll.scrollOf(alice.address)).to.equal(0n);
    expect(await scroll.tierSupply(1)).to.equal(1n);
    expect(await scroll.pendingReward(bob.address)).to.equal(parse("2.4"));
  });

  it("clears forfeited rewards into unallocated rewards when no holders remain in the tier", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    await token.connect(alice).transfer(owner.address, parse("401000"));
    await scroll.connect(alice).claim();

    expect(await scroll.scrollOf(alice.address)).to.equal(0n);
    expect(await scroll.tierSupply(1)).to.equal(0n);
    expect(await scroll.unallocatedTierRewards(1)).to.equal(parse("2.4"));
  });

  it("reverts claims when there is no reward", async function () {
    await scroll.connect(alice).register();

    await expectRevert(scroll.connect(alice).claim());
  });

  it("claims earned BNB and updates total claimed accounting", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    const beforeBalance = await ethers.provider.getBalance(alice.address);
    const tx = await scroll.connect(alice).claim();
    const receipt = await tx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const afterBalance = await ethers.provider.getBalance(alice.address);

    expect(afterBalance + gasCost - beforeBalance).to.equal(parse("2.4"));
    expect(await scroll.totalClaimed()).to.equal(parse("2.4"));
    expect(await scroll.pendingReward(alice.address)).to.equal(0n);
  });

  it("allows anyone to validate and burn an under-threshold scroll", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    await token.connect(alice).transfer(owner.address, parse("401000"));

    expect(await scroll.connect(bob).validateHolding.staticCall(alice.address)).to.equal(false);
    await scroll.connect(bob).validateHolding(alice.address);

    expect(await scroll.scrollOf(alice.address)).to.equal(0n);
    expect(await scroll.activeScrolls()).to.equal(0n);
    expect(await scroll.tierSupply(1)).to.equal(0n);
    expect(await scroll.unallocatedTierRewards(1)).to.equal(parse("2.4"));
    await expectRevert(scroll.ownerOf(1));
  });

  it("keeps scroll NFTs non-transferable", async function () {
    await scroll.connect(alice).register();

    await expectRevert(scroll.connect(alice).transferFrom(alice.address, bob.address, 1));
    expect(await scroll.ownerOf(1)).to.equal(alice.address);
  });

  it("restricts admin functions to the owner", async function () {
    const Router = await ethers.getContractFactory("MockPancakeRouter");
    const router = await Router.deploy("0x0000000000000000000000000000000000000001");

    await expectRevert(scroll.connect(alice).setRouter(await router.getAddress()));
    await expectRevert(scroll.connect(alice).setLpReceiver(lpReceiver.address));
    await expectRevert(scroll.connect(alice).setBaseURI("ipfs://scrolls/"));
    await expectRevert(
      scroll.connect(alice).executeBuybackAndAddLiquidity(
        parse("1"),
        0,
        0,
        0,
        (await ethers.provider.getBlock("latest")).timestamp + 3600
      )
    );
  });

  it("executes buyback and add-liquidity from the 20% reserve", async function () {
    const Router = await ethers.getContractFactory("MockPancakeRouter");
    const router = await Router.deploy("0x0000000000000000000000000000000000000001");

    await token.transfer(await router.getAddress(), parse("1000"));
    await router.setTokensOut(parse("100"));
    await scroll.setRouter(await router.getAddress());
    await scroll.setLpReceiver(lpReceiver.address);

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    await scroll.executeBuybackAndAddLiquidity(
      parse("1"),
      0,
      0,
      0,
      (await ethers.provider.getBlock("latest")).timestamp + 3600
    );

    expect(await scroll.buybackLpReserve()).to.equal(parse("1"));
    expect(await router.lastSwapETH()).to.equal(parse("0.5"));
    expect(await router.lastAddLiquidityETH()).to.equal(parse("0.5"));
    expect(await router.lastTokenDesired()).to.equal(parse("100"));
    expect(await token.balanceOf(lpReceiver.address)).to.equal(parse("100"));
  });

  it("tracks refunded BNB back into the buyback LP reserve", async function () {
    const Router = await ethers.getContractFactory("MockPancakeRouter");
    const router = await Router.deploy("0x0000000000000000000000000000000000000001");

    await token.transfer(await router.getAddress(), parse("1000"));
    await router.setTokensOut(parse("100"));
    await router.setUsageBps(10_000, 5_000);
    await scroll.setRouter(await router.getAddress());

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    await scroll.executeBuybackAndAddLiquidity(
      parse("1"),
      0,
      0,
      0,
      (await ethers.provider.getBlock("latest")).timestamp + 3600
    );

    expect(await scroll.buybackLpReserve()).to.equal(parse("1.25"));
  });
});
