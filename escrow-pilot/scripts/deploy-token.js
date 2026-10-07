import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error("Token deployment requires Sepolia. Use --network sepolia.");
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured. Set PRIVATE_KEY in the backend environment.");

  console.log(`Deploying TrustDApp Token on Sepolia from ${await deployer.getAddress()}...`);
  const Token = await hre.ethers.getContractFactory("TrustToken", deployer);
  const token = await Token.deploy();
  await token.waitForDeployment();
  const address = await token.getAddress();
  console.log(`TrustToken deployed at: ${address}`);
  console.log("Initial supply: 100,000,000 TRUST, minted to the deployer.");

  const contractsDir = path.resolve(__dirname, "..", "..", "frontend", "src", "contracts");
  fs.mkdirSync(contractsDir, { recursive: true });
  const addressPath = path.join(contractsDir, "contract-address.json");
  const addresses = fs.existsSync(addressPath)
    ? JSON.parse(fs.readFileSync(addressPath, "utf8"))
    : {};
  const artifact = await hre.artifacts.readArtifact("TrustToken");
  fs.writeFileSync(path.join(contractsDir, "TrustToken.json"), JSON.stringify({
    contractName: artifact.contractName,
    abi: artifact.abi,
  }, null, 2) + "\n");
  fs.writeFileSync(addressPath, JSON.stringify({ ...addresses, TrustToken: address }, null, 2) + "\n");
  console.log(`Token ABI and address exported to: ${contractsDir}`);
}

main().catch((error) => {
  console.error("Token deployment failed:", error);
  process.exitCode = 1;
});