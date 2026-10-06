import hre from "hardhat";

async function main() {
  // === گام مهم: آدرس کیف پول پیمانکار ===
  // یک آدرس معتبر 42 کاراکتری جایگزین شد تا ارور resolveName ندهد
  const contractorAddress = "0x1111111111111111111111111111111111111111";

  console.log("Starting deployment...");
  console.log("Contractor Address:", contractorAddress);

  const EscrowOracle = await hre.ethers.getContractFactory("EscrowOracle");
  const escrow = await EscrowOracle.deploy(contractorAddress);

  await escrow.waitForDeployment();

  console.log("-----------------------------------------");
  console.log("🎉 EscrowOracle Deployed Successfully!");
  console.log("📍 Contract Address:", escrow.target);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});