const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustEscrow Oracle vote regression", function () {
  let escrow, link, node, employer, contractor, arbiter, outsider;
  const budget = ethers.parseEther("1");

  beforeEach(async function () {
    [employer, contractor, arbiter, outsider] = await ethers.getSigners();
    link = await (await ethers.getContractFactory("OracleTestLink")).deploy();
    node = await (await ethers.getContractFactory("OracleTestNode")).deploy(await link.getAddress());
    escrow = await (await ethers.getContractFactory("TrustEscrow")).deploy(
      employer.address, contractor.address, arbiter.address, true,
      await link.getAddress(), await node.getAddress(), { value: budget }
    );
    await link.transfer(await escrow.getAddress(), ethers.parseEther("1"));
  });

  async function request() {
    await escrow.requestOracleDecision("https://example.com/status", "status");
    return node.lastRequestId();
  }

  it("encodes the uint256 job and multiplier and pays 0.1 LINK", async function () {
    await request();
    expect(await node.lastJobId()).to.equal(ethers.hexlify(ethers.toUtf8Bytes("ca98366cc7314957b8c012c72f05aeeb")));
    expect(await node.lastData()).to.contain("6574696d657301"); // CBOR text 'times', integer 1
    expect(await link.balanceOf(await node.getAddress())).to.equal(ethers.parseEther("0.1"));
    expect(await escrow.arbiter()).to.equal(ethers.ZeroAddress);
  });

  for (const decision of [1, 2]) {
    const vote = decision === 1 ? "approveRelease" : "approveRefund";
    const counter = decision === 1 ? "releaseApprovals" : "refundApprovals";
    const recipient = decision === 1 ? "contractor" : "employer";
    for (const human of ["employer", "contractor"]) {
      for (const oracleFirst of [true, false]) {
        it(`requires Oracle + ${human} for decision ${decision}, Oracle first=${oracleFirst}`, async function () {
          const signer = human === "employer" ? employer : contractor;
          const id = await request();
          if (oracleFirst) await node.respond(id, decision);
          else await escrow.connect(signer)[vote]();
          expect(await escrow.currentState()).to.equal(0n);
          expect(await escrow[counter]()).to.equal(1n);
          expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(budget);
          const payout = recipient === "contractor" ? contractor : employer;
          const tx = oracleFirst ? () => escrow.connect(signer)[vote]() : () => node.respond(id, decision);
          await expect(tx).to.changeEtherBalances([escrow, payout], [-budget, budget]);
          expect(await escrow.currentState()).to.equal(BigInt(decision));
        });
      }
    }
  }

  it("rejects outsider requests and forged callbacks", async function () {
    await expect(escrow.connect(outsider).requestOracleDecision("https://example.com", "status")).to.be.revertedWith("Only parties can request");
    const id = await request();
    await expect(escrow.connect(outsider).fulfill(id, 1)).to.be.revertedWith("Source must be the oracle of the request");
  });

  it("does not count duplicate or conflicting pending responses as additional votes", async function () {
    const first = await request();
    const second = await request();
    await node.respond(first, 1);
    await expect(node.respond(first, 1)).to.be.reverted;
    await expect(node.respond(second, 2)).to.emit(escrow, "OracleResponseIgnored");
    expect(await escrow.releaseApprovals()).to.equal(1n);
    expect(await escrow.refundApprovals()).to.equal(0n);
    expect(await escrow.currentState()).to.equal(0n);
    await expect(escrow.requestOracleDecision("https://example.com", "status")).to.be.revertedWith("Oracle already voted");
  });

  it("consumes invalid responses without voting and allows another request", async function () {
    await expect(node.respond(await request(), 7)).to.emit(escrow, "OracleResponseIgnored");
    expect(await escrow.oracleDecision()).to.equal(0n);
    await node.respond(await request(), 2);
    expect(await escrow.refundApprovals()).to.equal(1n);
  });

  it("keeps human agreement available and ignores late Oracle responses", async function () {
    const id = await request();
    await escrow.approveRelease();
    await escrow.connect(contractor).approveRelease();
    await expect(node.respond(id, 2)).to.emit(escrow, "OracleResponseIgnored");
    expect(await escrow.currentState()).to.equal(1n);
    expect(await escrow.refundApprovals()).to.equal(0n);
  });

  it("opposing human and Oracle votes do not settle", async function () {
    await escrow.approveRefund();
    await node.respond(await request(), 1);
    expect(await escrow.currentState()).to.equal(0n);
    expect(await escrow.releaseApprovals()).to.equal(1n);
    expect(await escrow.refundApprovals()).to.equal(1n);
  });

  for (const vote of ["approveRelease", "approveRefund"]) {
    for (const pair of [[0, 1], [0, 2], [1, 2]]) {
      it(`preserves manual ${vote} for role pair ${pair}`, async function () {
        const manual = await (await ethers.getContractFactory("TrustEscrow")).deploy(
          employer.address, contractor.address, arbiter.address, false,
          await link.getAddress(), await node.getAddress(), { value: budget }
        );
        const roles = [employer, contractor, arbiter];
        await manual.connect(roles[pair[0]])[vote]();
        expect(await manual.currentState()).to.equal(0n);
        await manual.connect(roles[pair[1]])[vote]();
        expect(await manual.currentState()).to.equal(vote === "approveRelease" ? 1n : 2n);
      });
    }
  }
});