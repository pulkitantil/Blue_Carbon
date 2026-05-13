import mongoose from "mongoose";

// ─── User Model ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    email:          { type: String, required: true, unique: true, lowercase: true },
    passwordHash:   { type: String, required: true },
    walletAddress:  { type: String, unique: true, sparse: true },
    role:           { type: String, enum: ["community", "verifier", "auditor", "admin"], default: "community" },
    organisation:   { type: String },
    country:        { type: String },
    isActive:       { type: Boolean, default: true },
    lastLogin:      { type: Date },
  },
  { timestamps: true }
);

// ─── Project Cache Model (mirrors on-chain, adds rich metadata) ───────────────
const projectCacheSchema = new mongoose.Schema(
  {
    onChainId:      { type: String, required: true, unique: true }, // blockchain projectId
    txHash:         { type: String },
    owner:          { type: String, required: true }, // wallet address
    name:           { type: String, required: true },
    description:    { type: String },
    ecosystemType:  { type: String, enum: ["MANGROVE", "SEAGRASS", "SALTMARSH", "TIDAL_WETLAND"] },
    status:         { type: String, default: "PENDING" },
    location: {
      latitude:     Number,
      longitude:    Number,
      areaHectares: Number,
      countryCode:  String,
      region:       String,
    },
    metadataURI:    { type: String },  // IPFS URI
    photoCIDs:      [String],
    documents:      [{ name: String, cid: String, uploadedAt: Date }],
    registeredAt:   { type: Date },
    verifiedAt:     { type: Date },
    verifiedBy:     { type: String },
    totalCarbonTonnes: { type: Number, default: 0 },
    tags:           [String],
    sdgGoals:       [Number],          // UN SDG numbers
  },
  { timestamps: true }
);

// ─── MRV Report Cache Model ────────────────────────────────────────────────────
const mrvReportCacheSchema = new mongoose.Schema(
  {
    onChainId:      { type: String, required: true, unique: true },
    projectOnChainId: { type: String, required: true },
    txHash:         { type: String },
    submittedBy:    { type: String },
    dataURI:        { type: String },   // IPFS URI to full report bundle
    carbonTonnes:   { type: Number },
    measurementDate:{ type: Date },
    status:         { type: String, default: "SUBMITTED" },
    reviewedBy:     { type: String },
    reviewNotes:    { type: String },
    methodology:    { type: String, default: "VERRA-VM0033" },
    attachments:    [{ name: String, cid: String }],
    submittedAt:    { type: Date },
    reviewedAt:     { type: Date },
  },
  { timestamps: true }
);

// ─── Carbon Credit Issuance Log ───────────────────────────────────────────────
const issuanceLogSchema = new mongoose.Schema(
  {
    onChainIssuanceId: { type: String, unique: true },
    projectOnChainId:  { type: String, required: true },
    reportOnChainId:   { type: String, required: true },
    txHash:            { type: String },
    recipient:         { type: String },
    bctAmount:         { type: String },    // in BCT (formatted)
    carbonTonnes:      { type: Number },
    issuedAt:          { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─── Retirement Log ───────────────────────────────────────────────────────────
const retirementLogSchema = new mongoose.Schema(
  {
    onChainRetirementId: { type: String, unique: true },
    projectOnChainId:    { type: String },
    txHash:              { type: String },
    beneficiary:         { type: String },
    amount:              { type: String },  // BCT amount
    reason:              { type: String },
    retiredAt:           { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User          = mongoose.model("User",          userSchema);
export const ProjectCache  = mongoose.model("ProjectCache",  projectCacheSchema);
export const MRVReportCache= mongoose.model("MRVReportCache",mrvReportCacheSchema);
export const IssuanceLog   = mongoose.model("IssuanceLog",   issuanceLogSchema);
export const RetirementLog = mongoose.model("RetirementLog", retirementLogSchema);

export default { User, ProjectCache, MRVReportCache, IssuanceLog, RetirementLog };
