# 🌊 Blue Carbon Registry — Frontend

React + Vite frontend for the Blue Carbon Registry blockchain system.

## Stack
- **React 18** + **Vite**
- **Tailwind CSS** — dark Web3 theme
- **React Router v6** — client-side routing
- **Zustand** — auth state management
- **React Hook Form** — form validation
- **Recharts** — carbon activity chart
- **Framer Motion** — animations
- **Axios** — API calls (proxied to backend)
- **ethers.js v6** — wallet utilities

## Pages

| Route | Page | Auth |
|-------|------|------|
| `/` | Landing — hero, stats, contracts | Public |
| `/auth` | Login / Register | Public |
| `/dashboard` | Stats, chart, quick actions | Required |
| `/projects` | Project registry listing | Public |
| `/projects/:id` | Project detail + audit trail | Public |
| `/register-project` | Register new project on-chain | community / admin |
| `/mrv/submit` | Submit MRV data report | community / admin |
| `/verifier` | Review reports, verify projects, issue BCT | verifier / admin |
| `/credits` | BCT balance, retire credits, history | Public |

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

> The `vite.config.js` proxies all `/api` requests to `http://localhost:3000` (your backend).
> Make sure the backend is running before starting the frontend.

## Environment Variables

Edit `.env` if your backend or contract addresses differ:

```env
VITE_API_URL=http://localhost:3000
VITE_REGISTRY_ADDRESS=0x45a3A0BA0f2B5aCC69966F796E1d59fEad89B2e6
VITE_CREDIT_TOKEN_ADDRESS=0x51A52D8aF1337a6bCb6f1fD1C09cFA9d3D5EB5d1
VITE_MANAGER_ADDRESS=0xeD90dE3f198EA6C83e60B79a1382401704E75f64
VITE_CHAIN_ID=11155111
```

## Build for Production

```bash
npm run build
# Output goes to ./dist/
```
