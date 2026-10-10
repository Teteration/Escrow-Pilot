# TrustDApp frontend

React/Vite client with Ethers v6, dark theme, and Persian RTL / English LTR escrow workflows. See the [project README](../README.md) and [setup guide](../docs/local-development.md).

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run preview
```

Uses an injected wallet on Sepolia and `src/contracts/contract-address.json`, `EscrowFactory.json`, and `TrustEscrow.json`. Backend deployment scripts export these files.

## Implemented interface features

- Unified navy/emerald styling, address search and status filters (statistics stay factory-wide), accessible transaction lifecycle notices with explorer links, read-loading/error feedback, keyboard skip link, table caption/column scopes and associated Oracle input help. Visual and real-wallet acceptance remain pending.

- Persian/English language selector, browser-local preference persistence, translated interface and application messages, language-aware statistics, and document `lang`/`dir` updates. Switching language does not reset wallet or form state. Provider/RPC error details and blockchain identifiers retain their original values.

- Responsive Persian RTL / English LTR dark dashboard: side-by-side creation/project workspace on wider screens, stacked sections and labeled project cards on smaller screens.
- Factory-wide totals for contracts, active contracts, completed contracts, and active registered budgets. These are not personal portfolio statistics; budget totals are not live contract balances.
- Participant details, role/status and approval badges, arbitration mode labels, and Sepolia Etherscan links for the connected account, Factory, escrow, and participants.
- Connect, select another account, and disconnect controls. Account changes reconnect the application without a page refresh; network changes reset the session and require reconnection on Sepolia.
- Animated green connection indicator with a static alternative for reduced-motion preferences. It indicates the application's connected account, not continuous wallet availability.
- Experimental Oracle creation settings and per-project request forms: HTTPS URL, numeric response field path, response example, submission feedback, vote display, and manual refresh.

## Important limitations

- Injected wallet access uses `window.ethereum`; multi-provider discovery/selection is not implemented. Mobile/QR sessions use WalletConnect. Wallet-neutral wording does not imply universal wallet support.
- Account-selection and permission-revocation requests depend on wallet support. Disconnect clears application state but does not lock the wallet; permissions may remain if revocation fails.
- Oracle API settings are page-local, disappear on reload, and are not stored or fixed on-chain. Creating an escrow does not submit an Oracle request. Each request requires 0.1 LINK in that escrow; successful submission does not guarantee fulfillment.
- Older escrows may not expose the Oracle vote getter. An unavailable vote is shown as unknown, not treated as verified compatibility with revised voting behavior.
- Logic currently lives in `src/App.jsx`. TRUST is not imported or used by the dashboard. No frontend secrets are needed; never put a deployer key in client code.

## Validation status

Lint and production build passed after the interface changes. The existing bundle-size warning remains. Automated frontend tests, visual acceptance across viewport sizes, and real-wallet account-selection/revocation checks are still pending; a headless-browser attempt did not produce usable verification output.

See the [roadmap](../docs/roadmap.md) for component extraction, tests, and remaining accessibility/visual checks.

### Light and dark themes

The header offers a translated light/dark theme selector. Dark is the default; the preference is saved locally and restored before the app renders. Changing theme preserves wallet, language, and form state. Browser visual and wallet interaction checks remain pending.

### Mobile wallet connection

Use the mobile/QR button for WalletConnect, or an injected wallet in its in-app browser. Configure `VITE_WALLETCONNECT_PROJECT_ID` using `frontend/.env.example` (copy to `.env.local` in the frontend directory) and restart Vite. No secrets or private keys belong in frontend variables. WalletConnect code is lazy-loaded. Real-device acceptance remains pending. See the [feature inventory](../docs/features.md) for setup, limitations, and test steps.

### Connection and disconnection status

Connection feedback distinguishes wallet preparation, QR/account approval, network checks, and account verification. Dashboard reads use independent Sepolia JSON-RPC, not the wallet relay; wallet connection does not certify successful data loading or continuous phone availability. Disconnect clears local state immediately, then attempts remote cleanup for up to 10 seconds. Timeout, unsupported revocation, and other cleanup failures appear as separate notices, not local-disconnect failures. See the feature inventory for real-device acceptance steps.
