import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { creditService } from "../services/blockchainService.js";
import { IssuanceLog, RetirementLog } from "../models/index.js";

const router = express.Router();

// ── GET /api/v1/credits/balance/:address ──────────────────────────────────────
router.get("/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address))
      return res.status(400).json({ success: false, message: "Invalid Ethereum address" });

    const balance = await creditService.getBalance(address);
    const totalSupply = await creditService.getTotalSupply();

    res.json({
      success: true,
      data: { address, balanceBCT: balance, totalSupplyBCT: totalSupply },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/credits/issuances ─────────────────────────────────────────────
router.get("/issuances", authenticate, async (req, res) => {
  try {
    const { projectId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (projectId) filter.projectOnChainId = projectId;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 20);
    const skip = (safePage - 1) * safeLimit;
    const [issuances, total] = await Promise.all([
      IssuanceLog.find(filter).skip(skip).limit(safeLimit).sort({ issuedAt: -1 }),
      IssuanceLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: issuances, pagination: { page: safePage, limit: safeLimit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/credits/retirements ───────────────────────────────────────────
router.get("/retirements", async (req, res) => {
  try {
    const { beneficiary, projectId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (beneficiary) filter.beneficiary = beneficiary.toLowerCase();
    if (projectId)   filter.projectOnChainId = projectId;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 20);
    const skip = (safePage - 1) * safeLimit;
    const [retirements, total] = await Promise.all([
      RetirementLog.find(filter).skip(skip).limit(safeLimit).sort({ retiredAt: -1 }),
      RetirementLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: retirements, pagination: { page: safePage, limit: safeLimit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/v1/credits/retire ───────────────────────────────────────────────
router.post(
  "/retire",
  authenticate,
  [
    body("amount").isFloat({ min: 0.000000001 }),
    body("projectId").notEmpty(),
    body("beneficiary").matches(/^0x[a-fA-F0-9]{40}$/),
    body("reason").notEmpty().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { amount, projectId, beneficiary, reason } = req.body;
      const result = await creditService.retireCredits({ amount, projectId, beneficiary, reason });

      // Retirement logging is handled asynchronously by the blockchainIndexer
      // listening to the CreditRetired event.
      res.json({
        success: true,
        message: `${amount} BCT retired successfully`,
        data: {
          txHash:    result.txHash,
          amount,
          beneficiary,
          reason,
          sepoliaUrl:`https://sepolia.etherscan.io/tx/${result.txHash}`,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
