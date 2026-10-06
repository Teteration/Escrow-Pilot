import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// شبیه‌سازی __dirname در ماژول‌های ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // آدرس اکانت دوم متامسک (پیمانکار)
  const contractorAddress = "0x96Dc5330E5695D1801CFc84E172aFC45cF96cb85";

  console.log("Starting deployment...");
  console.log("Contractor Address:", contractorAddress);

  const EscrowOracle = await hre.ethers.getContractFactory("EscrowOracle");
  const escrow = await EscrowOracle.deploy(contractorAddress);

  await escrow.waitForDeployment();
  const contractAddress = escrow.target;

  console.log("-----------------------------------------");
  console.log("🎉 EscrowOracle Deployed Successfully!");
  console.log("📍 Contract Address:", contractAddress);

  // === بخش ذخیره خودکار آدرس در فرانت‌اند ===
  // مسیر رفتن به پوشه فرانت‌اند (یک سطح عقب‌تر از پوشه اسکریپت‌ها)
  const contractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // ساخت فایل JSON و لاگ موفقیت در کنسول
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ EscrowOracle: contractAddress }, undefined, 2)
  );

  console.log("📂 File 'contract-address.json' updated dynamically in frontend!");
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});