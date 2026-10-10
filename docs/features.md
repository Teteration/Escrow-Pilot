# Feature inventory

Update this inventory whenever adding or changing a user-facing feature. Distinguish implementation from real-browser acceptance.

## Escrow and dashboard

- Isolated ETH escrows through a Factory; manual resolution requires two matching participant votes.
- Factory-wide statistics, address search, status filters, participant details, approval badges, and Sepolia Etherscan links.
- Responsive workspace and labeled project cards on narrower screens; keyboard focus and reduced-motion support.
- Transaction progress, rejection/error messages, and chain-read status.
- Persian/English selection with persisted preference and RTL/LTR direction.
- Light/dark selection with persisted preference, pre-render restoration, and themed forms/status notices. Visual acceptance pending.
- TRUST remains standalone and is not used for payments, fees, or balance display.

## Wallet connection

- Injected Ethereum wallets, including wallet in-app browsers, with account/network event handling.
- Before connection, show wallet connection and mobile/QR options only. After connection, show the account indicator, “Change account”, and disconnect controls. Account switching may require ending and reconnecting a mobile session; wallet permission support varies.
- WalletConnect mobile/QR option with lazy-loaded SDK and Sepolia-only session. Ordinary mobile browsers use this path when no injected provider exists.
- Wallet signatures and transactions use the selected wallet provider, not necessarily `window.ethereum`. Dashboard reads and post-transaction refreshes use an independent Sepolia JSON-RPC provider.
- WalletConnect requires `VITE_WALLETCONNECT_PROJECT_ID`. The actual local identifier is excluded from Git but is public in a frontend build; it is not a secret key.
- Missing project configuration is reported. No automatic signing or chain writes occur during connection.
- Real Chrome mobile, MetaMask, Trust Wallet, cancellation, reconnection, and account-switch acceptance remain pending. Use HTTPS for deployment; LAN HTTP app-switch behavior must be tested on the target devices.
- Restrict project origins in the dashboard before public deployment. An empty allowlist is not origin-restricted.

## Experimental oracle

- HTTPS API and numeric response path inputs; 1 = release vote, 2 = refund vote.
- Request submission and readable vote status where supported, with LINK and availability warnings.
- API configuration is page-local, not agreed/stored on-chain. Live fulfillment is not verified.
- Isolated CRE HTTP workflow prototype is simulated, not deployed or integrated with escrows.

## Connection progress feedback

- Separate preparation, QR/approval, account approval, network check/switch, account verification, and disconnect messages in both languages.
- A 20-second advisory identifies a slow connection step without declaring VPN/network failure or cancelling the pending wallet request.
- Wallet connection completes independently of escrow reads. The dashboard shows read progress (completed / total escrows) and read errors separately; connection buttons no longer stay busy for the whole dashboard load.
- Real-device acceptance of these messages remains pending. The delay advisory is not a timeout or an automatic retry.

## Acceptance checklist for mobile connection

1. Configure the project ID, restart Vite, and open the app in mobile Chrome.
2. Select mobile/QR connection, choose a wallet, approve Sepolia accounts, and return to the app.
3. Verify the displayed address and dashboard, then reject a transaction to verify feedback.
4. Disconnect, reconnect, and select another account in the wallet connection approval.
5. Verify injected-wallet connections still work and that switching themes/languages preserves the connection.
### Session and read isolation

Existing WalletConnect sessions can reconnect without another QR approval; this is not proof the phone is online. Dashboard reads use an independent Sepolia JSON-RPC provider (optional `VITE_SEPOLIA_RPC_URL`, 15-second request timeout), not wallet relay requests. The factory-list read also has a 20-second bound. Disconnect clears application state immediately and waits at most 10 seconds for remote session termination/revocation; timeout reports unconfirmed remote cleanup. Remote session removal can be completed in the wallet. Delay advisories reset per step. Live phone/relay acceptance remains pending.

Disconnect cleanup warnings distinguish timeout, unsupported permission revocation, and other errors. The app remains locally disconnected in all cases; these warnings do not assert remote cleanup succeeded. Safe diagnostic code/transport/message is logged to the console, not private keys or session payloads. Success on one browser does not validate another browser’s independent RPC/relay connectivity.

## Planned appearance customization (not implemented)

- Consolidate appearance controls into one dropdown, without adding separate header buttons.
- Preserve the current palette and introduce the previous navy/blue palette using Git history as the reference.
- Support light/dark variants and persisted palette selection without resetting wallet, language, or forms.
- Validate contrast, focus, responsive layout, and both languages for each appearance.
