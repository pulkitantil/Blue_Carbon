import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load ABIs ────────────────────────────────────────────────────────────────
function loadABI(contractName) {
  const artifactPath = path.join(
    __dirname, "../../artifacts/contracts",
    `${contractName}.sol`, `${contractName}.json`
  );
  if (fs.existsSync(artifactPath)) {
    return JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;
  }
  // Fallback: load from pre-exported ABIs
  const abiPath = path.join(__dirname, "../../config/abis", `${contractName}.json`);
  if (fs.existsSync(abiPath)) {
    return JSON.parse(fs.readFileSync(abiPath, "utf8"));
  }
  throw new Error(`ABI not found for ${contractName}. Run 'npx hardhat compile' first.`);
}

// ─── Provider & Signer ────────────────────────────────────────────────────────
let provider;
let signer;
let contracts = {};

export function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not set in .env");
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

export function getSigner() {
  if (!signer) {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("PRIVATE_KEY not set in .env");
    signer = new ethers.Wallet(pk, getProvider());
  }
  return signer;
}

export function getContracts() {
  if (Object.keys(contracts).length === 0) {
    initContracts();
  }
  return contracts;
}

function initContracts() {
  const s = getSigner();

  const registryAddr = process.env.REGISTRY_ADDRESS;
  const creditAddr   = process.env.CREDIT_TOKEN_ADDRESS;
  const managerAddr  = process.env.MANAGER_ADDRESS;

  if (!registryAddr || !creditAddr || !managerAddr) {
    throw new Error(
      "Contract addresses not set. Deploy first and update .env with REGISTRY_ADDRESS, CREDIT_TOKEN_ADDRESS, MANAGER_ADDRESS"
    );
  }

  contracts.registry = new ethers.Contract(registryAddr, loadABI("BlueCarbonRegistry"), s);
  contracts.credit   = new ethers.Contract(creditAddr,   loadABI("BlueCarbonCredit"),   s);
  contracts.manager  = new ethers.Contract(managerAddr,  loadABI("CreditIssuanceManager"), s);
}

// ─── Registry Helpers ─────────────────────────────────────────────────────────
export const registryService = {

  async registerProject(params) {
    const { registry } = getContracts();
    const tx = await registry.registerProject(
      params.name,
      params.description,
      params.ecosystemType,
      params.latitude,
      params.longitude,
      params.areaHectares,
      params.countryCode,
      params.metadataURI
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return registry.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "ProjectRegistered");
    return {
      txHash:    receipt.hash,
      projectId: event ? event.args.projectId.toString() : null,
      blockNumber: receipt.blockNumber,
    };
  },

  async getProject(projectId) {
    const { registry } = getContracts();
    const p = await registry.getProject(projectId);
    return formatProject(p);
  },

  async getOwnerProjects(address) {
    const { registry } = getContracts();
    const ids = await registry.getOwnerProjects(address);
    return ids.map(id => id.toString());
  },

  async submitMRVReport(params) {
    const { registry } = getContracts();
    const tx = await registry.submitMRVReport(
      params.projectId,
      params.dataURI,
      params.carbonTonnes,
      params.measurementDate
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return registry.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "MRVReportSubmitted");
    return {
      txHash:   receipt.hash,
      reportId: event ? event.args.reportId.toString() : null,
      blockNumber: receipt.blockNumber,
    };
  },

  async getMRVReport(reportId) {
    const { registry } = getContracts();
    const r = await registry.getMRVReport(reportId);
    return formatReport(r);
  },

  async getProjectReports(projectId) {
    const { registry } = getContracts();
    const ids = await registry.getProjectReports(projectId);
    return ids.map(id => id.toString());
  },

  async reviewMRVReport(reportId, approved, notes, signerOverride) {
    const { registry } = getContracts();
    const contract = signerOverride ? registry.connect(signerOverride) : registry;
    const tx = await contract.reviewMRVReport(reportId, approved, notes);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  },

  async verifyProject(projectId, approved, notes, signerOverride) {
    const { registry } = getContracts();
    const contract = signerOverride ? registry.connect(signerOverride) : registry;
    const tx = await contract.verifyProject(projectId, approved, notes);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  },

  async getRegistryStats() {
    const { registry } = getContracts();
    const stats = await registry.getRegistryStats();
    return {
      totalProjects:    stats.totalProjects.toString(),
      verifiedProjects: stats.verifiedProjects.toString(),
      totalReports:     stats.totalReports.toString(),
      totalCarbon:      stats.totalCarbon.toString(),
      totalCarbonTonnes: (Number(stats.totalCarbon) / 10000).toFixed(4),
    };
  },

  async getVerificationHistory(projectId) {
    const { registry } = getContracts();
    const events = await registry.getVerificationHistory(projectId);
    return events.map(e => ({
      timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
      actor:     e.actor,
      status:    PROJECT_STATUS_MAP[Number(e.newStatus)] || "UNKNOWN",
      notes:     e.notes,
    }));
  },
};

// ─── Credit Token Helpers ─────────────────────────────────────────────────────
export const creditService = {

  async getBalance(address) {
    const { credit } = getContracts();
    const bal = await credit.balanceOf(address);
    return ethers.formatEther(bal);
  },

  async retireCredits(params, signerOverride) {
    const { credit } = getContracts();
    const contract = signerOverride ? credit.connect(signerOverride) : credit;
    const amountWei = ethers.parseEther(params.amount.toString());
    const tx = await contract.retireCredits(
      amountWei,
      params.projectId,
      params.beneficiary,
      params.reason
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  },

  async getTotalSupply() {
    const { credit } = getContracts();
    const supply = await credit.totalSupply();
    return ethers.formatEther(supply);
  },

  async getProjectIssuances(projectId) {
    const { credit } = getContracts();
    const ids = await credit.getProjectIssuances(projectId);
    return ids.map(id => id.toString());
  },
};

// ─── Manager Helpers ──────────────────────────────────────────────────────────
export const managerService = {

  async issueForReport(reportId) {
    const { manager } = getContracts();
    const tx = await manager.issueForReport(reportId);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map(log => { try { return manager.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === "CreditsAutoIssued");
    return {
      txHash:    receipt.hash,
      bctIssued: event ? ethers.formatEther(event.args.bctAmount) : null,
      blockNumber: receipt.blockNumber,
    };
  },

  async isReportCredited(reportId) {
    const { manager } = getContracts();
    return manager.reportCredited(reportId);
  },
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const PROJECT_STATUS_MAP = {
  0: "PENDING", 1: "UNDER_REVIEW", 2: "VERIFIED",
  3: "REJECTED", 4: "SUSPENDED",   5: "COMPLETED"
};
const ECOSYSTEM_MAP = {
  0: "MANGROVE", 1: "SEAGRASS", 2: "SALTMARSH", 3: "TIDAL_WETLAND"
};
const MRV_STATUS_MAP = {
  0: "SUBMITTED", 1: "IN_REVIEW", 2: "APPROVED", 3: "REJECTED"
};

function formatProject(p) {
  return {
    id:               p.id.toString(),
    owner:            p.owner,
    name:             p.name,
    description:      p.description,
    ecosystemType:    ECOSYSTEM_MAP[Number(p.ecosystemType)] || "UNKNOWN",
    status:           PROJECT_STATUS_MAP[Number(p.status)] || "UNKNOWN",
    location: {
      latitude:     (Number(p.location.latitude)  / 1e6).toFixed(6),
      longitude:    (Number(p.location.longitude) / 1e6).toFixed(6),
      areaHectares: (Number(p.location.areaHectares) / 100).toFixed(2),
    },
    countryCode:      p.countryCode,
    metadataURI:      p.metadataURI,
    registeredAt:     new Date(Number(p.registeredAt) * 1000).toISOString(),
    verifiedAt:       p.verifiedAt > 0 ? new Date(Number(p.verifiedAt) * 1000).toISOString() : null,
    verifiedBy:       p.verifiedBy !== ethers.ZeroAddress ? p.verifiedBy : null,
    totalCarbonTonnes:(Number(p.totalCarbonTonnes) / 10000).toFixed(4),
  };
}

function formatReport(r) {
  return {
    reportId:        r.reportId.toString(),
    projectId:       r.projectId.toString(),
    submittedBy:     r.submittedBy,
    dataURI:         r.dataURI,
    carbonTonnes:    (Number(r.carbonTonnes) / 10000).toFixed(4),
    measurementDate: new Date(Number(r.measurementDate) * 1000).toISOString(),
    status:          MRV_STATUS_MAP[Number(r.status)] || "UNKNOWN",
    reviewedBy:      r.reviewedBy !== ethers.ZeroAddress ? r.reviewedBy : null,
    reviewNotes:     r.reviewNotes,
    submittedAt:     new Date(Number(r.submittedAt) * 1000).toISOString(),
    reviewedAt:      r.reviewedAt > 0 ? new Date(Number(r.reviewedAt) * 1000).toISOString() : null,
  };
}

export default { registryService, creditService, managerService, getProvider, getSigner };
