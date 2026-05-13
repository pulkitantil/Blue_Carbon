const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("═══════════════════════════════════════════════════════");
  console.log(" 🌊 Blue Carbon Registry — Deployment");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Network   : ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer  : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance   : ${ethers.formatEther(balance)} ETH`);
  console.log("───────────────────────────────────────────────────────");

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient balance. Get Sepolia ETH from https://sepoliafaucet.com");
  }

  // ── 1. Deploy BlueCarbonRegistry ──────────────────────────────────────────
  console.log("\n📋 Deploying BlueCarbonRegistry...");
  const Registry = await ethers.getContractFactory("BlueCarbonRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`   ✅ BlueCarbonRegistry deployed at: ${registryAddr}`);

  // ── 2. Deploy BlueCarbonCredit ────────────────────────────────────────────
  console.log("\n🪙  Deploying BlueCarbonCredit (BCT)...");
  const Credit = await ethers.getContractFactory("BlueCarbonCredit");
  const credit = await Credit.deploy(deployer.address);
  await credit.waitForDeployment();
  const creditAddr = await credit.getAddress();
  console.log(`   ✅ BlueCarbonCredit (BCT) deployed at: ${creditAddr}`);

  // ── 3. Deploy CreditIssuanceManager ──────────────────────────────────────
  console.log("\n⚙️  Deploying CreditIssuanceManager...");
  const Manager = await ethers.getContractFactory("CreditIssuanceManager");
  const manager = await Manager.deploy(deployer.address, registryAddr, creditAddr);
  await manager.waitForDeployment();
  const managerAddr = await manager.getAddress();
  console.log(`   ✅ CreditIssuanceManager deployed at: ${managerAddr}`);

  // ── 4. Wire roles ─────────────────────────────────────────────────────────
  console.log("\n🔐 Setting up roles...");

  const MINTER_ROLE   = await credit.MINTER_ROLE();
  const ISSUER_ROLE   = await manager.ISSUER_ROLE();
  const VERIFIER_ROLE = await registry.VERIFIER_ROLE();
  const AUDITOR_ROLE  = await registry.AUDITOR_ROLE();

  // Manager needs MINTER_ROLE on credit token
  let tx = await credit.grantRole(MINTER_ROLE, managerAddr);
  await tx.wait();
  console.log(`   ✅ Granted MINTER_ROLE to CreditIssuanceManager`);

  // Deployer is default VERIFIER and AUDITOR (can be changed after deployment)
  tx = await registry.grantRole(VERIFIER_ROLE, deployer.address);
  await tx.wait();
  console.log(`   ✅ Granted VERIFIER_ROLE to deployer`);

  tx = await registry.grantRole(AUDITOR_ROLE, deployer.address);
  await tx.wait();
  console.log(`   ✅ Granted AUDITOR_ROLE to deployer`);

  // Deployer is ISSUER on manager
  tx = await manager.grantRole(ISSUER_ROLE, deployer.address);
  await tx.wait();
  console.log(`   ✅ Granted ISSUER_ROLE to deployer`);

  // ── 5. Save deployment addresses ─────────────────────────────────────────
  const deploymentData = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      BlueCarbonRegistry:    registryAddr,
      BlueCarbonCredit:      creditAddr,
      CreditIssuanceManager: managerAddr,
    },
    roles: {
      VERIFIER_ROLE,
      AUDITOR_ROLE,
      MINTER_ROLE,
      ISSUER_ROLE,
    },
  };

  const outDir = path.join(__dirname, "../config");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "deployment.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  // Also write a .env-ready snippet
  const envSnippet = `
# ─── Deployed Contract Addresses (${network.name}) ───
REGISTRY_ADDRESS=${registryAddr}
CREDIT_TOKEN_ADDRESS=${creditAddr}
MANAGER_ADDRESS=${managerAddr}
CHAIN_ID=${network.chainId}
`;
  fs.writeFileSync(path.join(outDir, "addresses.env"), envSnippet.trim());

  // ── 6. Summary ────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════");
  console.log(" ✅ Deployment Complete!");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`BlueCarbonRegistry    : ${registryAddr}`);
  console.log(`BlueCarbonCredit(BCT) : ${creditAddr}`);
  console.log(`CreditIssuanceManager : ${managerAddr}`);
  console.log("───────────────────────────────────────────────────────");
  console.log(`Config saved to: config/deployment.json`);
  console.log(`Env snippet  to: config/addresses.env`);
  console.log("\n🔍 Verify on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${registryAddr} "${deployer.address}"`);
  console.log(`   npx hardhat verify --network sepolia ${creditAddr} "${deployer.address}"`);
  console.log(`   npx hardhat verify --network sepolia ${managerAddr} "${deployer.address}" "${registryAddr}" "${creditAddr}"`);

  return deploymentData;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deployment failed:", err.message);
    process.exit(1);
  });
