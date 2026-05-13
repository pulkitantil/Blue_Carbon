/**
 * blockchain-indexer.js
 * ─────────────────────
 * Listens to on-chain events from BlueCarbonRegistry and BlueCarbonCredit
 * Logs events (MongoDB escaped)
 *
 * Run independently: node backend/services/blockchainIndexer.js
 */

import dotenv from "dotenv";
import { ethers } from "ethers";
import { getProvider, getContracts } from "./blockchainService.js";
// import { ProjectCache, MRVReportCache, IssuanceLog, RetirementLog } from "../models/index.js";

dotenv.config();

const PROJECT_STATUS = ["PENDING","UNDER_REVIEW","VERIFIED","REJECTED","SUSPENDED","COMPLETED"];
const MRV_STATUS     = ["SUBMITTED","IN_REVIEW","APPROVED","REJECTED"];
const ECOSYSTEM      = ["MANGROVE","SEAGRASS","SALTMARSH","TIDAL_WETLAND"];

async function start() {
  console.log("✅ Indexer: MongoDB escaped/disabled - logging events only");

  const provider = getProvider();
  const { registry, credit } = getContracts();

  // ── Registry: ProjectRegistered ──────────────────────────────────────────
  registry.on("ProjectRegistered", async (projectId, owner, name, ecosystemType, countryCode, event) => {
    console.log(`[EVENT] ProjectRegistered #${projectId} by ${owner} (no DB cache)`);
    try {
      const p = await registry.getProject(projectId);
      console.log('Project data:', {projectId: projectId.toString(), owner, name, ecosystemType: ECOSYSTEM[Number(ecosystemType)]});
    } catch (err) {
      console.error("[INDEX ERROR] ProjectRegistered:", err.message);
    }
  });

  // ── Registry: ProjectStatusChanged ───────────────────────────────────────
  registry.on("ProjectStatusChanged", async (projectId, oldStatus, newStatus, actor, event) => {
    console.log(`[EVENT] Project #${projectId} status → ${PROJECT_STATUS[Number(newStatus)]} (no DB)`);
    // DB update skipped
  });

  // ── Registry: MRVReportSubmitted ─────────────────────────────────────────
  registry.on("MRVReportSubmitted", async (reportId, projectId, submittedBy, carbonTonnes, event) => {
    console.log(`[EVENT] MRV Report #${reportId} submitted for project #${projectId} (no DB)`);
    try {
      const r = await registry.getMRVReport(reportId);
      console.log('MRV data:', {reportId, projectId, carbonTonnes: Number(carbonTonnes) / 10000});
    } catch (err) {
      console.error("[INDEX ERROR] MRVReportSubmitted:", err.message);
    }
  });

  // ── Registry: MRVReportReviewed ───────────────────────────────────────────
  registry.on("MRVReportReviewed", async (reportId, projectId, status, reviewedBy, event) => {
    console.log(`[EVENT] MRV Report #${reportId} reviewed → ${MRV_STATUS[Number(status)]} (no DB)`);
    // DB update skipped
  });

  // ── Registry: CarbonDataUpdated ───────────────────────────────────────────
  registry.on("CarbonDataUpdated", async (projectId, additionalTonnes, totalTonnes) => {
    console.log(`[EVENT] Carbon updated for project #${projectId}: total=${Number(totalTonnes)/10000} (no DB)`);
  });

  // ── Credit: CreditIssued ──────────────────────────────────────────────────
  credit.on("CreditIssued", async (issuanceId, projectId, reportId, recipient, amount, event) => {
    console.log(`[EVENT] BCT issued #${issuanceId}: ${ethers.formatEther(amount)} BCT → ${recipient} (no DB)`);
  });

  // ── Credit: CreditRetired ─────────────────────────────────────────────────
  credit.on("CreditRetired", async (retirementId, beneficiary, projectId, amount, reason, event) => {
    console.log(`[EVENT] BCT retired #${retirementId}: ${ethers.formatEther(amount)} BCT by ${beneficiary} (no DB)`);
  });

  console.log("👂 Indexer listening for blockchain events on Sepolia...");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Indexer shutting down...");
    registry.removeAllListeners();
    credit.removeAllListeners();
    process.exit(0);
  });
}

start().catch(err => {
  console.error("❌ Indexer failed to start:", err.message);
  process.exit(1);
});
