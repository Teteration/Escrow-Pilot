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

## Revised Oracle workflow

The updated escrow requires two matching votes, including at most one Oracle vote. Deploy a **new Factory** with the command above and create a new Oracle-mode escrow. Existing deployed instances cannot be patched. Never overwrite old addresses/ABIs until ready to switch the client. The current dashboard has no Oracle-request form or dynamic Oracle-vote badge; use this script to inspect the actual on-chain vote.

Transfer at least 0.1 Sepolia LINK to the **individual escrow**. From `escrow-pilot`, inspect it without sending a request:

```bash
ESCROW_ADDRESS=0xYourNewEscrow npx hardhat run scripts/request-oracle.js --network sepolia
```

Send a paid request explicitly (replace example values with your test deployment and public API):

```bash
ESCROW_ADDRESS=0xYourNewEscrow ORACLE_SEND=true ORACLE_API_URL=https://your-api.example/status ORACLE_JSON_PATH=status npx hardhat run scripts/request-oracle.js --network sepolia
```

API should return JSON with integer status 1 or 2, for example `{"status":1}`. Nested job paths use comma delimiters. Do not let arbitrary participant-owned endpoints decide production disputes. The script checks network, role, revised interface, and LINK funding, then logs transaction/request ID. Run read-only again later; request confirmation is not proof of callback. Public job availability is not guaranteed. A dedicated compatible node/job or a separately designed service is needed if the public node does not respond.

## Optional standalone token deployment

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