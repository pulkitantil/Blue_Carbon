// import express from "express";
// import multer from "multer";
// import { body, validationResult } from "express-validator";
// import { authenticate, requireRole, optionalAuth } from "../middleware/auth.js";
// import { registryService } from "../services/blockchainService.js";
// import { pinProjectMetadata } from "../services/ipfsService.js";
// import { ProjectCache } from "../models/index.js";

// const router = express.Router();

// // File upload configuration
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 50 * 1024 * 1024 }
// });

// // Ecosystem enum mapping
// const ECOSYSTEM_ENUM = {
//   MANGROVE: 0,
//   SEAGRASS: 1,
//   SALTMARSH: 2,
//   TIDAL_WETLAND: 3
// };

// // ─────────────────────────────────────────────────────────────
// // GET /api/v1/projects  (public listing with filters)
// // ─────────────────────────────────────────────────────────────
// router.get("/", optionalAuth, async (req, res) => {
//   try {
//     const {
//       status,
//       ecosystemType,
//       countryCode,
//       page = 1,
//       limit = 20,
//       search
//     } = req.query;

//     const filter = {};

//     if (status) filter.status = status.toUpperCase();
//     if (ecosystemType) filter.ecosystemType = ecosystemType.toUpperCase();
//     if (countryCode) filter["location.countryCode"] = countryCode.toUpperCase();
//     if (search) filter.$text = { $search: search };

//     const safePage = Math.max(1, Number(page) || 1);
//     const safeLimit = Math.max(1, Number(limit) || 20);
//     const skip = (safePage - 1) * safeLimit;

//     const [projects, total] = await Promise.all([
//       ProjectCache.find(filter)
//         .skip(skip)
//         .limit(safeLimit)
//         .sort({ createdAt: -1 }),
//       ProjectCache.countDocuments(filter)
//     ]);

//     res.json({
//       success: true,
//       data: projects,
//       pagination: {
//         page: safePage,
//         limit: safeLimit,
//         total,
//         pages: Math.ceil(total / safeLimit)
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // ─────────────────────────────────────────────────────────────
// // GET /api/v1/projects/stats
// // ─────────────────────────────────────────────────────────────
// router.get("/stats", async (req, res) => {
//   try {
//     let dbStats = [];

//     try {
//       dbStats = await ProjectCache.aggregate([
//         {
//           $group: {
//             _id: "$status",
//             count: { $sum: 1 },
//             totalCarbon: { $sum: "$totalCarbonTonnes" }
//           }
//         }
//       ]);
//     } catch (dbErr) {
//       console.warn("DB stats unavailable:", dbErr.message);
//     }

//     const chainStats = await registryService.getRegistryStats();

//     res.json({
//       success: true,
//       data: {
//         chain: chainStats,
//         breakdown: dbStats
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // ─────────────────────────────────────────────────────────────
// // GET /api/v1/projects/:id
// // ─────────────────────────────────────────────────────────────
// router.get("/:id", optionalAuth, async (req, res) => {
//   try {
//     const cached = await ProjectCache.findOne({
//       onChainId: req.params.id
//     });

//     if (cached) {
//       return res.json({
//         success: true,
//         data: cached,
//         source: "cache"
//       });
//     }

//     const project = await registryService.getProject(req.params.id);

//     res.json({
//       success: true,
//       data: project,
//       source: "chain"
//     });
//   } catch (err) {
//     res.status(404).json({
//       success: false,
//       message: "Project not found"
//     });
//   }
// });

// // ─────────────────────────────────────────────────────────────
// // GET /api/v1/projects/:id/history
// // ─────────────────────────────────────────────────────────────
// router.get("/:id/history", async (req, res) => {
//   try {
//     const history = await registryService.getVerificationHistory(
//       req.params.id
//     );

//     res.json({ success: true, data: history });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // ─────────────────────────────────────────────────────────────
// // POST /api/v1/projects  (UPDATED FOR DATASET FIELDS)
// // This version matches CSV dataset columns like:
// // Project_Name, Country, Latitude, Longitude, Area, Carbon_Tonnes, Status
// // ─────────────────────────────────────────────────────────────
// router.post(
//   "/",
//   authenticate,
//   upload.array("photos", 10),
//   [
//     body("projectName").notEmpty().trim(),
//     body("country").notEmpty().trim(),
//     body("latitude").isFloat({ min: -90, max: 90 }),
//     body("longitude").isFloat({ min: -180, max: 180 }),
//     body("area").isFloat({ min: 0.01 }),
//     body("carbonTonnes").isFloat({ min: 0 })
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         errors: errors.array()
//       });
//     }

//     try {
//       const {
//         projectName,
//         description,
//         ecosystemType,
//         latitude,
//         longitude,
//         area,
//         country,
//         carbonTonnes,
//         status,
//         region,
//         tags,
//         sdgGoals
//       } = req.body;

//       // Optional: Pin metadata to IPFS
//       let metadataURI = null;

//       try {
//         metadataURI = await pinProjectMetadata({
//           project: {
//             name: projectName,
//             description,
//             ecosystemType,
//             latitude,
//             longitude,
//             area,
//             country
//           },
//           imageFiles: req.files || []
//         });
//       } catch (ipfsErr) {
//         console.warn("IPFS upload skipped:", ipfsErr.message);
//       }

//       // Optional: Register on blockchain
//       let blockchainResult = null;

//       try {
//         if (ecosystemType && ECOSYSTEM_ENUM[ecosystemType]) {
//           blockchainResult = await registryService.registerProject({
//             name: projectName,
//             description: description || "Blue Carbon Project",
//             ecosystemType: ECOSYSTEM_ENUM[ecosystemType],
//             latitude: Math.round(parseFloat(latitude) * 1e6),
//             longitude: Math.round(parseFloat(longitude) * 1e6),
//             areaHectares: Math.round(parseFloat(area) * 100),
//             countryCode: country,
//             metadataURI
//           });
//         }
//       } catch (chainErr) {
//         console.warn("Blockchain registration skipped:", chainErr.message);
//       }

//       // Parse optional JSON fields
//       let parsedTags = [];
//       let parsedSdgGoals = [];

//       try {
//         if (tags) parsedTags = JSON.parse(tags);
//         if (sdgGoals) parsedSdgGoals = JSON.parse(sdgGoals);
//       } catch (parseErr) {
//         console.warn("Optional JSON parse error:", parseErr.message);
//       }

//       // Save to MongoDB
//       const newProject = await ProjectCache.create({
//         onChainId: blockchainResult?.projectId,
//         txHash: blockchainResult?.txHash,

//         name: projectName,
//         description: description || "Blue Carbon Project",

//         ecosystemType: ecosystemType || "MANGROVE",

//         location: {
//           latitude,
//           longitude,
//           areaHectares: area,
//           countryCode: country,
//           region
//         },

//         totalCarbonTonnes: carbonTonnes,

//         metadataURI,

//         status: status || "PENDING",

//         registeredAt: new Date(),

//         tags: parsedTags,
//         sdgGoals: parsedSdgGoals
//       });

//       res.status(201).json({
//         success: true,
//         message: "Project added successfully",
//         data: newProject
//       });
//     } catch (err) {
//       res.status(500).json({
//         success: false,
//         message: err.message
//       });
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────
// // PATCH /api/v1/projects/:id/verify
// // ─────────────────────────────────────────────────────────────
// router.patch(
//   "/:id/verify",
//   authenticate,
//   requireRole("verifier", "admin"),
//   [
//     body("approved").isBoolean(),
//     body("notes").notEmpty().trim()
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         errors: errors.array()
//       });
//     }

//     try {
//       const { approved, notes } = req.body;

//       const result = await registryService.verifyProject(
//         req.params.id,
//         approved,
//         notes
//       );

//       await ProjectCache.findOneAndUpdate(
//         { onChainId: req.params.id },
//         {
//           status: approved ? "VERIFIED" : "REJECTED",
//           verifiedAt: approved ? new Date() : undefined
//         }
//       );

//       res.json({
//         success: true,
//         message: `Project ${approved ? "verified" : "rejected"} successfully`,
//         data: {
//           txHash: result.txHash
//         }
//       });
//     } catch (err) {
//       res.status(500).json({
//         success: false,
//         message: err.message
//       });
//     }
//   }
// );

// // ─────────────────────────────────────────────────────────────
// // PATCH /api/v1/projects/:id/suspend
// // ─────────────────────────────────────────────────────────────
// router.patch(
//   "/:id/suspend",
//   authenticate,
//   requireRole("auditor", "admin"),
//   [body("reason").notEmpty()],
//   async (req, res) => {
//     try {
//       res.json({
//         success: true,
//         message: "Suspend endpoint ready — requires auditor wallet signer"
//       });
//     } catch (err) {
//       res.status(500).json({
//         success: false,
//         message: err.message
//       });
//     }
//   }
// );

// export default router;








import express from "express";
import multer from "multer";
import { body, param, query, validationResult } from "express-validator";
import { authenticate, requireRole, optionalAuth } from "../middleware/auth.js";
import { registryService } from "../services/blockchainService.js";
import { pinProjectMetadata } from "../services/ipfsService.js";
import { ProjectCache } from "../models/index.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const ECOSYSTEM_ENUM = { MANGROVE: 0, SEAGRASS: 1, SALTMARSH: 2, TIDAL_WETLAND: 3 };

// ── GET /api/v1/projects  (public listing with filters) ───────────────────────
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      status, ecosystemType, countryCode,
      page = 1, limit = 20, search
    } = req.query;

    const filter = {};
    if (status)        filter.status = status.toUpperCase();
    if (ecosystemType) filter.ecosystemType = ecosystemType.toUpperCase();
    if (countryCode)   filter["location.countryCode"] = countryCode.toUpperCase();
    if (search)        filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [projects, total] = await Promise.all([
      ProjectCache.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      ProjectCache.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/projects/stats ────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [chainStats, dbStats] = await Promise.all([
      registryService.getRegistryStats(),
      ProjectCache.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, totalCarbon: { $sum: "$totalCarbonTonnes" } } }
      ]),
    ]);
    res.json({ success: true, data: { chain: chainStats, breakdown: dbStats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/v1/projects/:id ──────────────────────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    // Try DB cache first, fall back to chain
    const cached = await ProjectCache.findOne({ onChainId: req.params.id });
    if (cached) return res.json({ success: true, data: cached, source: "cache" });

    const project = await registryService.getProject(req.params.id);
    res.json({ success: true, data: project, source: "chain" });
  } catch (err) {
    res.status(404).json({ success: false, message: "Project not found" });
  }
});

// ── GET /api/v1/projects/:id/history ─────────────────────────────────────────
router.get("/:id/history", async (req, res) => {
  try {
    const history = await registryService.getVerificationHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/v1/projects (register new project) ──────────────────────────────
router.post(
  "/",
  authenticate,
  upload.array("photos", 10),
  [
    body("name").notEmpty().trim(),
    body("description").notEmpty().trim(),
    body("ecosystemType").isIn(Object.keys(ECOSYSTEM_ENUM)),
    body("latitude").isFloat({ min: -90, max: 90 }),
    body("longitude").isFloat({ min: -180, max: 180 }),
    body("areaHectares").isFloat({ min: 0.01 }),
    body("countryCode").isLength({ min: 2, max: 2 }).toUpperCase(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    if (!req.user.walletAddress)
      return res.status(400).json({ success: false, message: "Wallet address required. Update your profile first." });

    try {
      const {
        name, description, ecosystemType,
        latitude, longitude, areaHectares,
        countryCode, region, tags, sdgGoals,
      } = req.body;

      // 1. Pin metadata + photos to IPFS
      const metadataURI = await pinProjectMetadata({
        project: { name, description, ecosystemType, latitude, longitude, areaHectares, countryCode },
        imageFiles: req.files || [],
      });

      // 2. Register on-chain
      const result = await registryService.registerProject({
        name,
        description,
        ecosystemType:  ECOSYSTEM_ENUM[ecosystemType],
        latitude:  Math.round(parseFloat(latitude)  * 1e6),
        longitude: Math.round(parseFloat(longitude) * 1e6),
        areaHectares: Math.round(parseFloat(areaHectares) * 100),
        countryCode,
        metadataURI,
      });

      // 3. Cache in MongoDB
      const cached = await ProjectCache.create({
        onChainId:    result.projectId,
        txHash:       result.txHash,
        owner:        req.user.walletAddress,
        name, description, ecosystemType,
        location:     { latitude, longitude, areaHectares, countryCode, region },
        metadataURI,
        photoCIDs:    [], // extracted from pinata if needed
        registeredAt: new Date(),
        tags:         tags ? JSON.parse(tags) : [],
        sdgGoals:     sdgGoals ? JSON.parse(sdgGoals) : [],
      });

      res.status(201).json({
        success: true,
        message: "Project registered successfully on Sepolia",
        data: {
          projectId:  result.projectId,
          txHash:     result.txHash,
          metadataURI,
          blockNumber: result.blockNumber,
          sepoliaUrl: `https://sepolia.etherscan.io/tx/${result.txHash}`,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── PATCH /api/v1/projects/:id/verify ────────────────────────────────────────
router.patch(
  "/:id/verify",
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
      const result = await registryService.verifyProject(req.params.id, approved, notes);

      // Update cache
      await ProjectCache.findOneAndUpdate(
        { onChainId: req.params.id },
        {
          status:     approved ? "VERIFIED" : "REJECTED",
          verifiedBy: req.user.walletAddress,
          verifiedAt: approved ? new Date() : undefined,
        }
      );

      res.json({
        success: true,
        message: `Project ${approved ? "verified" : "rejected"} successfully`,
        data: { txHash: result.txHash, sepoliaUrl: `https://sepolia.etherscan.io/tx/${result.txHash}` },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── PATCH /api/v1/projects/:id/suspend ───────────────────────────────────────
router.patch(
  "/:id/suspend",
  authenticate,
  requireRole("auditor", "admin"),
  [body("reason").notEmpty()],
  async (req, res) => {
    try {
      // Note: suspendProject is called directly on registry by the auditor's wallet
      // In production the API would use the auditor's own signer
      res.json({ success: true, message: "Suspend endpoint ready — requires auditor wallet signer" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;