const { expect } = require("chai");
const { ethers } = require("hardhat");

const parse = ethers.parseEther;

describe("CultivationScroll", function () {
  let owner;
  let alice;
  let bob;
  let token;
  let scroll;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("CultivationToken");
    token = await Token.deploy(
      "Cultivation Token",
      "XIU",
      parse("10000000"),
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
  });

  it("registers a tier-1 scroll when the holder meets the token threshold", async function () {
    await scroll.connect(alice).register();

    expect(await scroll.scrollOf(alice.address)).to.equal(1n);
    expect(await scroll.tierOf(alice.address)).to.equal(1n);
    expect(await scroll.tierSupply(1)).to.equal(1n);
  });

  it("splits received BNB into 80% dividends and 20% buyback LP reserve", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });

    expect(await scroll.buybackLpReserve()).to.equal(parse("2"));
    expect(await scroll.pendingReward(alice.address)).to.equal(parse("2.4"));
  });

  it("burns the required token amount when upgrading tiers", async function () {
    await scroll.connect(alice).register();
    await token.connect(alice).approve(await scroll.getAddress(), parse("50000"));

    await scroll.connect(alice).upgrade();

    expect(await scroll.tierOf(alice.address)).to.equal(2n);
    expect(await scroll.tierSupply(1)).to.equal(0n);
    expect(await scroll.tierSupply(2)).to.equal(1n);
    expect(await token.balanceOf(alice.address)).to.equal(parse("450000"));
  });

  it("invalidates the scroll and clears rewards when current holding drops below the tier threshold", async function () {
    await scroll.connect(alice).register();

    await owner.sendTransaction({
      to: await scroll.getAddress(),
      value: parse("10")
    });
    expect(await scroll.pendingReward(alice.address)).to.equal(parse("2.4"));

    await token.connect(alice).transfer(owner.address, parse("401000"));
    expect(await scroll.pendingReward(alice.address)).to.equal(0n);

    await scroll.connect(alice).claim();

    expect(await scroll.scrollOf(alice.address)).to.equal(0n);
    expect(await scroll.tierOf(alice.address)).to.equal(0n);
    expect(await scroll.tierSupply(1)).to.equal(0n);
  });

  it("keeps scroll NFTs non-transferable", async function () {
    await scroll.connect(alice).register();

    let reverted = false;
    try {
      await scroll.connect(alice).transferFrom(alice.address, bob.address, 1);
    } catch (error) {
      reverted = true;
    }

    expect(reverted).to.equal(true);
    expect(await scroll.ownerOf(1)).to.equal(alice.address);
  });
});
