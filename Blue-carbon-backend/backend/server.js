import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Routes
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import mrvRoutes     from "./routes/mrv.js";
import creditRoutes  from "./routes/credits.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;
const API  = `/api/${process.env.API_VERSION || "v1"}`;

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean),
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// const limiter = rateLimit({
//   windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
//   max:      Number(process.env.RATE_LIMIT_MAX)        || 100,
//   standardHeaders: true,
//   message: { success: false, message: "Too many requests, please try again later." },
// });
// app.use(API, limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(`${API}/auth`,     authRoutes);
app.use(`${API}/projects`, projectRoutes);
app.use(`${API}/mrv`,      mrvRoutes);
app.use(`${API}/credits`, creditRoutes);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version || "1.0.0",
    network:   "Ethereum Sepolia Testnet",
    chainId:   process.env.CHAIN_ID || "11155111",
    contracts: {
      registry: process.env.REGISTRY_ADDRESS   || "not deployed",
      credit:   process.env.CREDIT_TOKEN_ADDRESS || "not deployed",
      manager:  process.env.MANAGER_ADDRESS    || "not deployed",
    },
    db: { state: mongoose.connection.readyState === 1 ? "connected" : "disconnected", name: mongoose.connection.name || "unknown" },
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// ─── Database + Start ─────────────────────────────────────────────────────────
async function start() {
  try {

    // Connect MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected Successfully");
    console.log("Database:", mongoose.connection.name);

    app.listen(PORT, () => {
      console.log("═══════════════════════════════════════════════════════");
      console.log(" 🌊 Blue Carbon Registry API");
      console.log("═══════════════════════════════════════════════════════");
      console.log(` Server  : http://localhost:${PORT}`);
      console.log(` API     : http://localhost:${PORT}${API}`);
      console.log(` Health  : http://localhost:${PORT}/health`);
      console.log("═══════════════════════════════════════════════════════");
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  }
}

start();

export default app;
