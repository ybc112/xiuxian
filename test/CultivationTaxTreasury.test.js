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

describe("CultivationTaxTreasury", function () {
  let owner;
  let alice;
  let bob;
  let token;
  let scroll;
  let treasury;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("CultivationToken");
    token = await Token.deploy(
      "Cultivation Token",
      "XIU",
      parse("1000000000"),
      owner.address
    );

    const Scroll = await ethers.getContractFactory("CultivationScroll");
    scroll = await Scroll.deploy(
      await token.getAddress(),
      "Cultivation Scroll",
      "SCROLL",
      owner.address
    );

    const Treasury = await ethers.getContractFactory("CultivationTaxTreasury");
    treasury = await Treasury.deploy(owner.address);

    await token.transfer(alice.address, parse("500000"));
  });

  it("accepts Four.meme tax BNB before the reward vault is configured", async function () {
    await owner.sendTransaction({
      to: await treasury.getAddress(),
      value: parse("3")
    });

    expect(await treasury.totalReceived()).to.equal(parse("3"));
    expect(await treasury.treasuryBalance()).to.equal(parse("3"));
    expect(await ethers.provider.getBalance(await treasury.getAddress())).to.equal(parse("3"));
  });

  it("restricts reward vault setup to the owner", async function () {
    await expectRevert(treasury.connect(alice).setRewardVault(await scroll.getAddress()));

    await treasury.setRewardVault(await scroll.getAddress());
    expect(await treasury.rewardVault()).to.equal(await scroll.getAddress());
  });

  it("routes collected taxes into scroll rewards after setup", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await treasury.getAddress(),
      value: parse("10")
    });
    await treasury.setRewardVault(await scroll.getAddress());

    await treasury.connect(bob).routeToRewardVault(0);

    expect(await treasury.treasuryBalance()).to.equal(0n);
    expect(await treasury.totalRouted()).to.equal(parse("10"));
    expect(await scroll.totalDividendReceived()).to.equal(parse("8"));
    expect(await scroll.buybackLpReserve()).to.equal(parse("2"));
    expect(await scroll.pendingReward(alice.address)).to.equal(parse("2.4"));
  });

  it("allows partial routing while preserving the remaining treasury balance", async function () {
    await owner.sendTransaction({
      to: await treasury.getAddress(),
      value: parse("10")
    });
    await treasury.setRewardVault(await scroll.getAddress());

    await treasury.routeToRewardVault(parse("4"));

    expect(await treasury.treasuryBalance()).to.equal(parse("6"));
    expect(await treasury.totalRouted()).to.equal(parse("4"));
    expect(await scroll.totalDividendReceived()).to.equal(parse("3.2"));
    expect(await scroll.buybackLpReserve()).to.equal(parse("0.8"));
  });

  it("rejects routing before setup and over-routing", async function () {
    await owner.sendTransaction({
      to: await treasury.getAddress(),
      value: parse("1")
    });

    await expectRevert(treasury.routeToRewardVault(0));

    await treasury.setRewardVault(await scroll.getAddress());
    await expectRevert(treasury.routeToRewardVault(parse("2")));
  });
});
