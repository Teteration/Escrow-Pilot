import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Construct __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying EscrowFactory...");

  // 1. Deploy the Factory contract
  const Factory = await hre.ethers.getContractFactory("EscrowFactory");
  const factory = await Factory.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log(`✅ EscrowFactory successfully deployed at: ${factoryAddress}`);

  // 2. Extract and save ABI/Address files for the frontend
  saveFrontendFiles(factoryAddress);
}

function saveFrontendFiles(factoryAddress) {
  // Navigating up twice (..) to go from /escrow-pilot/scripts to /blockChainProj/frontend/src/contracts
  const contractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save the Factory contract address
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ EscrowFactory: factoryAddress }, undefined, 2)
  );

  // Extract and save the Factory ABI
  const FactoryArtifact = hre.artifacts.readArtifactSync("EscrowFactory");
  fs.writeFileSync(
    path.join(contractsDir, "EscrowFactory.json"),
    JSON.stringify(FactoryArtifact, null, 2)
  );

  // Extract and save the TrustEscrow ABI (needed by frontend to interact with spawned contracts)
  const EscrowArtifact = hre.artifacts.readArtifactSync("TrustEscrow");
  fs.writeFileSync(
    path.join(contractsDir, "TrustEscrow.json"),
    JSON.stringify(EscrowArtifact, null, 2)
  );

  console.log(`📂 ABI and address files successfully updated in: ${contractsDir}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});