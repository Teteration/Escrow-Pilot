import hre from "hardhat";

async function main() {
  if ((await hre.ethers.provider.getNetwork()).chainId !== 11155111n) {
    throw new Error("Use --network sepolia.");
  }
  const address = process.env.ESCROW_ADDRESS;
  if (!hre.ethers.isAddress(address)) throw new Error("Set ESCROW_ADDRESS to a newly deployed Oracle-mode escrow.");
  const [signer] = await hre.ethers.getSigners();
  if (!signer) throw new Error("No PRIVATE_KEY configured.");
  if (await hre.ethers.provider.getCode(address) === "0x") throw new Error("No contract at ESCROW_ADDRESS.");
  const escrow = await hre.ethers.getContractAt("TrustEscrow", address, signer);
  // Also proves this is the revised interface rather than an old deployed escrow.
  const decision = await escrow.oracleDecision();
  console.log(`Escrow: ${address}, state: ${await escrow.currentState()}, Oracle vote: ${decision}`);
  console.log(`Release votes: ${await escrow.releaseApprovals()}, refund votes: ${await escrow.refundApprovals()}`);
  if (process.env.ORACLE_SEND !== "true") {
    console.log("Read-only mode. Set ORACLE_SEND=true, ORACLE_API_URL and ORACLE_JSON_PATH to send a paid request.");
    return;
  }
  if (!(await escrow.isOracleMode())) throw new Error("Escrow is not in Oracle mode.");
  if ((await escrow.currentState()) !== 0n || decision !== 0n) throw new Error("Escrow resolved or Oracle already voted.");
  const sender = await signer.getAddress();
  if (![await escrow.employer(), await escrow.contractor()].some(role => role.toLowerCase() === sender.toLowerCase())) {
    throw new Error("Only employer or contractor can request.");
  }
  const url = process.env.ORACLE_API_URL;
  const jsonPath = process.env.ORACLE_JSON_PATH;
  if (!url || !jsonPath || new URL(url).protocol !== "https:") throw new Error("Provide a public HTTPS API URL and JSON path.");
  const link = new hre.ethers.Contract("0x779877A7B0D9E8603169DdbD7836e478b4624789", ["function balanceOf(address) view returns (uint256)"], hre.ethers.provider);
  const balance = await link.balanceOf(address);
  console.log(`Escrow LINK balance: ${hre.ethers.formatEther(balance)}`);
  if (balance < hre.ethers.parseEther("0.1")) throw new Error("Fund this escrow with at least 0.1 Sepolia LINK first.");
  const tx = await escrow.requestOracleDecision(url, jsonPath);
  console.log(`Request transaction: ${tx.hash}`);
  const receipt = await tx.wait();
  for (const log of receipt.logs) {
    try {
      const parsed = escrow.interface.parseLog(log);
      if (parsed?.name === "OracleRequested") console.log(`Request ID: ${parsed.args.requestId}`);
    } catch { /* LINK/Oracle logs have separate interfaces. */ }
  }
  console.log("Request confirmed, not fulfillment. Run again without ORACLE_SEND to inspect votes later.");
}

main().catch(error => {
  console.error("Oracle request failed:", error);
  process.exitCode = 1;
});