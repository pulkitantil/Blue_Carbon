import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { User } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "7d" }
  );

// POST /api/v1/auth/register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("role").optional().isIn(["community", "verifier", "auditor", "admin"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const { email, password, walletAddress, organisation, country, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(409).json({ success: false, message: "Email already registered" });

      const passwordHash = await bcrypt.hash(password, 12);

      // Validate or omit walletAddress
      const cleanWalletAddress = walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress) 
        ? walletAddress 
        : undefined;

      const userData = {
        email, 
        passwordHash, 
        ...(cleanWalletAddress && { walletAddress: cleanWalletAddress }),
        ...(organisation && { organisation }),
        ...(country && { country }),
        // Only allow non-admin roles to self-register
        role: ["community", "verifier", "auditor"].includes(role) ? role : "community",
      };

      const user = await User.create(userData);

      const token = signToken(user);
      res.status(201).json({
        success: true,
        token,
        user: { id: user._id, email: user.email, role: user.role, walletAddress: user.walletAddress },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/v1/auth/login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.passwordHash)))
        return res.status(401).json({ success: false, message: "Invalid credentials" });

      user.lastLogin = new Date();
      await user.save();

      const token = signToken(user);
      res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email, role: user.role, walletAddress: user.walletAddress },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/v1/auth/me
router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

// PATCH /api/v1/auth/wallet
router.patch("/wallet", authenticate, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress))
      return res.status(400).json({ success: false, message: "Invalid wallet address" });

    req.user.walletAddress = walletAddress;
    await req.user.save();
    res.json({ success: true, walletAddress });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
