const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustToken", function () {
  let token, deployer, recipient, spender;
  const supply = ethers.parseUnits("100000000", 18);

  beforeEach(async function () {
    [deployer, recipient, spender] = await ethers.getSigners();
    token = await (await ethers.getContractFactory("TrustToken")).deploy();
    await token.waitForDeployment();
  });

  it("sets metadata and mints the entire fixed supply to the deployer", async function () {
    expect(await token.name()).to.equal("TrustDApp Token");
    expect(await token.symbol()).to.equal("TRUST");
    expect(await token.decimals()).to.equal(18);
    expect(await token.INITIAL_SUPPLY()).to.equal(supply);
    expect(await token.totalSupply()).to.equal(supply);
    expect(await token.balanceOf(deployer.address)).to.equal(supply);
    expect(await token.balanceOf(recipient.address)).to.equal(0n);
  });

  it("transfers tokens without changing total supply", async function () {
    const amount = ethers.parseUnits("1250.25", 18);
    await expect(token.transfer(recipient.address, amount))
      .to.emit(token, "Transfer").withArgs(deployer.address, recipient.address, amount);
    expect(await token.balanceOf(recipient.address)).to.equal(amount);
    expect(await token.balanceOf(deployer.address)).to.equal(supply - amount);
    expect(await token.totalSupply()).to.equal(supply);
  });

  it("supports approvals and allowance-limited transferFrom", async function () {
    await token.approve(spender.address, 100n);
    await token.connect(spender).transferFrom(deployer.address, recipient.address, 40n);
    expect(await token.allowance(deployer.address, spender.address)).to.equal(60n);
    expect(await token.balanceOf(recipient.address)).to.equal(40n);
    await expect(token.connect(spender).transferFrom(deployer.address, recipient.address, 61n)).to.be.reverted;
  });

  it("rejects insufficient balances and transfers to the zero address", async function () {
    await expect(token.connect(recipient).transfer(deployer.address, 1n)).to.be.reverted;
    await expect(token.transfer(ethers.ZeroAddress, 1n)).to.be.reverted;
  });

  it("exposes no external mint or burn function", function () {
    expect(token.interface.getFunction("mint")).to.equal(null);
    expect(token.interface.getFunction("burn")).to.equal(null);
  });
});