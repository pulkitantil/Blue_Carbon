import express from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { authenticate, requireRole } from "../middleware/auth.js";
import { registryService, managerService } from "../services/blockchainService.js";
import { pinMRVReport } from "../services/ipfsService.js";
import { MRVReportCache, IssuanceLog } from "../models/index.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── GET /api/v1/mrv  (list reports, optionally filtered by projectId) ─────────
router.get("/", authenticate, async (req, res) => {
  try {
    const { projectId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (projectId) filter.projectOnChainId = projectId;
    if (status)    filter.status = status.toUpperCase();

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 20);
    const skip = (safePage - 1) * safeLimit;
    const [reports, total] = await Promise.all([
      MRVReportCache.find(filter).skip(skip).limit(safeLimit).sort({ submittedAt: -1 }),
      MRVReportCache.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: { page: safePage, limit: safeLimit, total },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/mrv/:id ───────────────────────────────────────────────────────
router.get("/:id", authenticate, async (req, res) => {
  try {
    const cached = await MRVReportCache.findOne({ onChainId: req.params.id });
    if (cached) return res.json({ success: true, data: cached, source: "cache" });

    const report = await registryService.getMRVReport(req.params.id);
    res.json({ success: true, data: report, source: "chain" });
  } catch (err) {
    res.status(404).json({ success: false, message: "Report not found" });
  }
});

// ── POST /api/v1/mrv (submit MRV data report) ─────────────────────────────────
router.post(
  "/",
  authenticate,
  upload.array("files", 20),
  [
    body("projectId").notEmpty(),
    body("carbonTonnes").isFloat({ min: 0.0001 }),
    body("measurementDate").isISO8601(),
    body("methodology").optional().trim(),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    if (!req.user.walletAddress)
      return res.status(400).json({ success: false, message: "Wallet address required" });

    try {
      const { projectId, carbonTonnes, measurementDate, methodology, notes } = req.body;

      // 1. Pin report bundle + attachments to IPFS
      const dataURI = await pinMRVReport({
        report: { projectId, carbonTonnes, measurementDate, methodology, notes },
        dataFiles: req.files || [],
      });

      // 2. Convert tonnes to on-chain scaled value (×1e4)
      const carbonScaled = BigInt(Math.round(parseFloat(carbonTonnes) * 10000));
      const measurementTs = Math.floor(new Date(measurementDate).getTime() / 1000);

      // 3. Submit on-chain
      const result = await registryService.submitMRVReport({
        projectId,
        dataURI,
        carbonTonnes: carbonScaled,
        measurementDate: measurementTs,
      });

      // 4. Cache in MongoDB
      const cached = await MRVReportCache.create({
        onChainId:       result.reportId,
        projectOnChainId: projectId,
        txHash:          result.txHash,
        submittedBy:     req.user.walletAddress,
        dataURI,
        carbonTonnes:    parseFloat(carbonTonnes),
        measurementDate: new Date(measurementDate),
        methodology:     methodology || "VERRA-VM0033",
        notes:           notes || "",
        attachments:     (req.files || []).map(f => ({ name: f.originalname })),
        submittedAt:     new Date(),
      });

      res.status(201).json({
        success: true,
        message: "MRV report submitted to Sepolia blockchain",
        data: {
          reportId:   result.reportId,
          txHash:     result.txHash,
          dataURI,
          blockNumber: result.blockNumber,
          sepoliaUrl: `https://sepolia.etherscan.io/tx/${result.txHash}`,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── PATCH /api/v1/mrv/:id/review (verifier approves/rejects) ─────────────────
router.patch(
  "/:id/review",
  authenticate,
  requireRole("verifier", "auditor", "admin"),
  [
    body("approved").isBoolean(),
    body("notes").notEmpty().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { approved, notes } = req.body;
      const result = await registryService.reviewMRVReport(req.params.id, approved, notes);

      // Update cache
      await MRVReportCache.findOneAndUpdate(
        { onChainId: req.params.id },
        {
          status:     approved ? "APPROVED" : "REJECTED",
          reviewedBy: req.user.walletAddress,
          reviewNotes: notes,
          reviewedAt: new Date(),
        }
      );

      res.json({
        success: true,
        message: `MRV report ${approved ? "approved" : "rejected"}`,
        data: { txHash: result.txHash, sepoliaUrl: `https://sepolia.etherscan.io/tx/${result.txHash}` },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── POST /api/v1/mrv/:id/issue-credits ───────────────────────────────────────
router.post(
  "/:id/issue-credits",
  authenticate,
  requireRole("admin", "verifier", "auditor"),
  async (req, res) => {
    try {
      const reportId = req.params.id;
      const alreadyCredited = await managerService.isReportCredited(reportId);
      if (alreadyCredited)
        return res.status(409).json({ success: false, message: "Credits already issued for this report" });

      const result = await managerService.issueForReport(reportId);

      // Issuance logging is handled asynchronously by the blockchainIndexer
      // listening to the CreditIssued event.

      res.json({
        success: true,
        message: "Blue Carbon Credits (BCT) issued successfully",
        data: {
          txHash:    result.txHash,
          bctIssued: result.bctIssued,
          sepoliaUrl:`https://sepolia.etherscan.io/tx/${result.txHash}`,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
