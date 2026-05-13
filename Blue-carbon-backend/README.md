# 🌊 Blue Carbon Registry & MRV System
### Ethereum Sepolia Testnet

A blockchain-based platform for registering, monitoring, and verifying blue carbon projects (mangroves, seagrass, saltmarshes). Smart contracts on Ethereum Sepolia ensure tamper-proof records and automatic carbon credit issuance.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND PORTAL                         │
│              (React / Next.js — connect separately)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                    EXPRESS API SERVER                           │
│  /auth  /projects  /mrv  /credits                              │
│  JWT Auth · Rate Limiting · Multer File Upload                 │
└──────┬──────────────────────────────────────┬───────────────────┘
       │                                      │
┌──────▼──────┐                    ┌──────────▼──────────────────┐
│  MongoDB    │                    │   IPFS (Pinata)             │
│  Off-chain  │                    │   Photos · Reports · JSON   │
│  cache +    │                    │   metadata pinned as CIDs   │
│  user auth  │                    └─────────────────────────────┘
└─────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                 ETHEREUM SEPOLIA TESTNET                        │
│                                                                 │
│  ┌──────────────────────┐   ┌─────────────────────────────┐   │
│  │  BlueCarbonRegistry  │   │     BlueCarbonCredit (BCT)  │   │
│  │                      │   │     ERC-20 Token            │   │
│  │  • registerProject() │   │  • issueCredits()           │   │
│  │  • submitMRVReport() │   │  • retireCredits()          │   │
│  │  • verifyProject()   │   │  • 1 BCT = 1 tonne CO₂e    │   │
│  │  • reviewMRVReport() │   └─────────────────────────────┘   │
│  └──────────┬───────────┘                ▲                    │
│             │                            │                    │
│  ┌──────────▼───────────────────────────┐│                    │
│  │      CreditIssuanceManager           ││                    │
│  │  Bridges Registry → BCT token        ││                    │
│  │  • issueForReport()  ────────────────┘│                    │
│  │  • batchIssue()                       │                    │
│  └───────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Lifecycle

```
Community           Verifier              Blockchain
    │                   │                     │
    │── registerProject ──────────────────────▶ PENDING
    │                   │                     │
    │── submitMRVReport ──────────────────────▶ UNDER_REVIEW
    │   (IPFS photos +  │                     │
    │    measurements)  │                     │
    │                   │── reviewMRVReport ──▶ MRV: APPROVED
    │                   │── verifyProject   ──▶ VERIFIED
    │                   │                     │
    │◀─ issueForReport ──────────────────── BCT minted
    │   (BCT credited)  │                     │
    │── retireCredits ────────────────────────▶ BCT burned
    │   (offset claim)  │                     │
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- Alchemy or Infura Sepolia RPC endpoint
- MetaMask wallet with Sepolia ETH ([faucet](https://sepoliafaucet.com))
- Pinata account for IPFS

### 1. Clone & Install

```bash
git clone <repo-url>
cd blue-carbon-registry
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
# - SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# - PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
# - MONGODB_URI=mongodb://localhost:27017/blue_carbon_registry
# - PINATA_API_KEY + PINATA_SECRET_API_KEY
# - JWT_SECRET=a-long-random-secret
```

### 3. Compile Smart Contracts

```bash
npm run compile
# Outputs ABI + bytecode to ./artifacts/
```

### 4. Run Tests

```bash
npm test
# Runs full test suite on local Hardhat network
# Tests: registration, MRV flow, verification, credit issuance, retirement
```

### 5. Deploy to Sepolia

```bash
npm run deploy:sepolia
# Deploys all 3 contracts and saves addresses to:
#   config/deployment.json
#   config/addresses.env

# Copy the output addresses into your .env:
# REGISTRY_ADDRESS=0x...
# CREDIT_TOKEN_ADDRESS=0x...
# MANAGER_ADDRESS=0x...
```

### 6. Verify on Etherscan (optional but recommended)

```bash
npx hardhat verify --network sepolia --config hardhat.config.cjs \
  <REGISTRY_ADDRESS> "0xYOUR_DEPLOYER_ADDRESS"

npx hardhat verify --network sepolia --config hardhat.config.cjs \
  <CREDIT_ADDRESS> "0xYOUR_DEPLOYER_ADDRESS"

npx hardhat verify --network sepolia --config hardhat.config.cjs \
  <MANAGER_ADDRESS> "0xYOUR_DEPLOYER_ADDRESS" "<REGISTRY>" "<CREDIT>"
```

### 7. Start the API

```bash
npm start           # production
npm run dev         # development with auto-reload
npm run indexer     # real-time blockchain event indexer (separate process)
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user account |
| POST | `/api/v1/auth/login` | Login, get JWT |
| GET  | `/api/v1/auth/me` | Get current user |
| PATCH| `/api/v1/auth/wallet` | Link wallet address |

### Projects

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/v1/projects` | public | List projects (filterable) |
| GET  | `/api/v1/projects/stats` | public | Registry statistics |
| GET  | `/api/v1/projects/:id` | public | Get project by ID |
| GET  | `/api/v1/projects/:id/history` | public | Verification audit trail |
| POST | `/api/v1/projects` | community | Register new project |
| PATCH| `/api/v1/projects/:id/verify` | verifier | Approve / reject project |
| PATCH| `/api/v1/projects/:id/suspend`| auditor | Suspend a project |

**POST /api/v1/projects body (multipart/form-data):**
```
name            string      required
description     string      required
ecosystemType   MANGROVE | SEAGRASS | SALTMARSH | TIDAL_WETLAND
latitude        float       required  (e.g. 21.85)
longitude       float       required  (e.g. 89.42)
areaHectares    float       required  (e.g. 500.0)
countryCode     string(2)   required  (e.g. "BD")
region          string      optional
tags            JSON array  optional  (e.g. ["restoration","coastal"])
sdgGoals        JSON array  optional  (e.g. [13,14,15])
photos          files       optional  (up to 10 images)
```

### MRV Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/v1/mrv` | authenticated | List reports |
| GET  | `/api/v1/mrv/:id` | authenticated | Get report by ID |
| POST | `/api/v1/mrv` | community | Submit MRV data + files |
| PATCH| `/api/v1/mrv/:id/review` | verifier | Approve / reject report |
| POST | `/api/v1/mrv/:id/issue-credits` | verifier | Trigger BCT issuance |

**POST /api/v1/mrv body (multipart/form-data):**
```
projectId       string      required  (on-chain project ID)
carbonTonnes    float       required  (e.g. 850.5)
measurementDate ISO8601     required  (e.g. "2025-03-01")
methodology     string      optional  (default: "VERRA-VM0033")
notes           string      optional
files           files       optional  (GPS exports, sensor data, photos)
```

### Carbon Credits

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/v1/credits/balance/:address` | public | BCT balance for wallet |
| GET  | `/api/v1/credits/issuances` | authenticated | Issuance history |
| GET  | `/api/v1/credits/retirements` | public | Retirement / offset history |
| POST | `/api/v1/credits/retire` | authenticated | Retire BCT to offset emissions |

---

## Smart Contract Addresses

After deployment, addresses are saved to `config/deployment.json`.
View on Sepolia Etherscan:
- `https://sepolia.etherscan.io/address/<REGISTRY_ADDRESS>`
- `https://sepolia.etherscan.io/address/<CREDIT_TOKEN_ADDRESS>`
- `https://sepolia.etherscan.io/address/<MANAGER_ADDRESS>`

---

## Roles & Access Control

| Role | Capabilities |
|------|-------------|
| `community` | Register projects, submit MRV reports |
| `verifier`  | Review MRV reports, verify/reject projects, issue credits |
| `auditor`   | Suspend / reinstate verified projects |
| `admin`     | All of the above + manage roles, pause contracts |

---

## Data Flow: Carbon Scale

The blockchain stores carbon as integers to avoid floating-point issues:

```
Field          | Stored as      | Example
carbonTonnes   | tonnes × 1e4   | 850.5 tonnes → 8505000
latitude       | degrees × 1e6  | 21.85° → 21850000
areaHectares   | ha × 1e2       | 500.25 ha → 50025
BCT token      | 18 decimals    | 1 BCT = 1e18 wei = 1 tonne
```

Conversion from carbon stored value to BCT:
```
BCT = carbonTonnes_scaled × 1e14
e.g. 8505000 × 1e14 = 8.505 × 10^20 wei = 850.5 BCT
```

---

## File Structure

```
blue-carbon-registry/
├── contracts/
│   ├── BlueCarbonRegistry.sol      # Core project + MRV registry
│   ├── BlueCarbonCredit.sol        # BCT ERC-20 token
│   └── CreditIssuanceManager.sol  # Registry ↔ Token bridge
├── scripts/
│   └── deploy.cjs                  # Deployment script
├── test/
│   └── BlueCarbonRegistry.test.cjs # Full test suite
├── backend/
│   ├── server.js                   # Express app entry point
│   ├── routes/
│   │   ├── auth.js                 # /auth endpoints
│   │   ├── projects.js             # /projects endpoints
│   │   ├── mrv.js                  # /mrv endpoints
│   │   └── credits.js              # /credits endpoints
│   ├── services/
│   │   ├── blockchainService.js    # ethers.js contract wrappers
│   │   ├── ipfsService.js          # Pinata IPFS upload/fetch
│   │   └── blockchainIndexer.js   # Real-time event sync to MongoDB
│   ├── models/
│   │   └── index.js                # Mongoose schemas
│   └── middleware/
│       └── auth.js                 # JWT + role middleware
├── config/
│   ├── deployment.json             # Auto-generated after deploy
│   └── addresses.env               # Auto-generated after deploy
├── hardhat.config.cjs
├── .env.example
└── README.md
```

---

## Security Checklist

- [x] Smart contracts use OpenZeppelin AccessControl, ReentrancyGuard, Pausable
- [x] Double-minting prevention via `reportCredited` mapping
- [x] Role separation: community / verifier / auditor / admin
- [x] Integer-only arithmetic on-chain (no floating point)
- [x] JWT authentication with expiry
- [x] Rate limiting on all API routes
- [x] Helmet security headers
- [x] Input validation via express-validator
- [x] IPFS content addressing for tamper-evident file storage
- [ ] Multisig recommended for admin role in production
- [ ] Formal audit recommended before mainnet deployment

---

## License

MIT
