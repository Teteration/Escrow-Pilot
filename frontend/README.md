# TrustDApp frontend

React/Vite client with Ethers v6, dark theme, and Persian RTL escrow workflows. See the [project README](../README.md) and [setup guide](../docs/local-development.md).

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run preview
```

Uses an injected wallet on Sepolia and `src/contracts/contract-address.json`, `EscrowFactory.json`, and `TrustEscrow.json`. Backend deployment scripts export these files. Reconnect after wallet/network changes.

Logic currently lives in `src/App.jsx`. Oracle-mode creation exists, but requesting a decision is not exposed. TRUST is not imported or used by the dashboard. No frontend secrets are needed; never put a deployer key in client code.

See the [roadmap](../docs/roadmap.md) for component extraction, tests, and styling cleanup.
