import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // ۱. آدرس‌های مورد نیاز
  const contractorAddress = "0x96Dc5330E5695D1801CFc84E172aFC45cF96cb85"; 
  const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; 

  console.log("🚀 Starting deployment...");
  
  // ۲. دیپلوی قرارداد
  const EscrowOracle = await hre.ethers.getContractFactory("EscrowOracle");
  const escrow = await EscrowOracle.deploy(contractorAddress);
  await escrow.waitForDeployment();
  
  const contractAddress = escrow.target;

  console.log("-----------------------------------------");
  console.log("🎉 EscrowOracle Deployed Successfully!");
  console.log("📍 Contract Address:", contractAddress);

  // ۳. شارژ خودکار قرارداد با توکن LINK
  console.log("⏳ Funding contract with 1 LINK...");
  try {
    const [deployer] = await hre.ethers.getSigners();
    const erc20Abi = [
      "function transfer(address to, uint256 amount) returns (bool)"
    ];
    const linkToken = new hre.ethers.Contract(linkTokenAddress, erc20Abi, deployer);
    const fundAmount = hre.ethers.parseUnits("1", 18); 
    
    const tx = await linkToken.transfer(contractAddress, fundAmount);
    await tx.wait();
    console.log("✅ Successfully funded the contract with 1 LINK!");
  } catch (error) {
    console.error("❌ Failed to fund LINK. آیا مطمئنید اکانت اصلی شما توکن LINK دارد؟");
  }

  // === ۴. همگام‌سازی کامل با فرانت‌اند (Address + ABI) ===
  const contractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");
  
  // مسیر فایل کامپایل‌شده ABI در هاردت
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "EscrowOracle.sol", "EscrowOracle.json");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // به‌روزرسانی آدرس
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ EscrowOracle: contractAddress }, undefined, 2)
  );
  console.log("📂 File 'contract-address.json' updated dynamically in frontend!");

  // کپی خودکار فایل ABI به فرانت‌اند
  if (fs.existsSync(artifactPath)) {
    fs.copyFileSync(artifactPath, path.join(contractsDir, "EscrowOracle.json"));
    console.log("⚙️  File 'EscrowOracle.json' (ABI) auto-copied to frontend!");
  } else {
    console.error("⚠️ ABI Artifact not found! پروژه باید حتماً کامپایل شده باشد.");
  }
  
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});