# Deployment

> Sepolia only; no mainnet release or audit is claimed. These documentation changes do not perform a deployment.

Install backend dependencies, compile, and test first. Copy `.env.example` to `escrow-pilot/.env`, set a dedicated test wallet's `PRIVATE_KEY`, and provide Sepolia ETH for gas. Hardhat uses a fixed public RPC; custom RPC environment variables are not supported.

## Factory

```bash
cd escrow-pilot
npx hardhat run scripts/deploy.js --network sepolia
```

Deploys only Factory and exports to the sibling frontend:

- `frontend/src/contracts/contract-address.json`
- `frontend/src/contracts/EscrowFactory.json`
- `frontend/src/contracts/TrustEscrow.json`

**Warning:** replaces the entire address map with `{ EscrowFactory: ... }`. Preserve separately recorded token addresses. It exports full artifacts, does not fund LINK, and does not deploy the legacy Oracle.

Users create escrows by sending ETH through the client. Manual mode needs no LINK. Experimental Oracle requests need separate LINK deposits to each escrow.

## Optional standalone token

```bash
cd escrow-pilot
npx hardhat run scripts/deploy-token.js --network sepolia
```

Checks chain ID `11155111`, deploys TRUST, mints all 100 million to deployer, exports `TrustToken.json` (ABI), and merges the token address without removing Factory entries. The client does not use the token.

If deploying both, deploy Factory first, then token. Record token address separately: a later Factory deploy removes its map entry. There is no vesting contract or allocation schedule.

## After deployment

- Record network, address, transaction hash, and source commit.
- Check deployed bytecode and constructor behavior in a Sepolia explorer.
- Inspect exported JSON before committing; exclude secrets.
- Restart/rebuild the client after changing addresses.
- Test manual release/refund with test funds.
- Do not claim explorer verification, Oracle availability, or an audit without doing it.

No verified deployment ledger or hosted demo exists yet. Checked-in addresses are development configuration, not a service guarantee. Changing JSON does not migrate existing escrows. Hosting the frontend is separate future work.