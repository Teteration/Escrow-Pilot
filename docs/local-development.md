# Local development

## Prerequisites and setup

Validated locally: Node.js 22.22.1 and npm 9.2.0. Fresh installation needs registry access and Hardhat may download the compiler. Backend/frontend have separate lockfiles; there is no root npm workspace.

From the repository root:

```bash
cd escrow-pilot
npm ci
npx hardhat compile
npx hardhat test
cd ../frontend
npm ci
npm run lint
npm run dev
```

Open the address printed by Vite. Build and preview from `frontend`:

```bash
npm run build
npm run preview
```

## Environment

Compile, token tests, lint, and build need no secrets. For deployment only, copy the example from the repository root:

```bash
cp escrow-pilot/.env.example escrow-pilot/.env
```

Set `PRIVATE_KEY` to a dedicated test wallet key. Never use a wallet holding real assets or commit `.env`. Hardhat uses a fixed public Sepolia RPC URL; `SEPOLIA_RPC_URL` is not read. The client needs no environment secrets.

## Local tests versus interactive use

Hardhat tests use an ephemeral local chain. Vite serves locally, but wallet interaction still targets Sepolia. There is no complete localhost-chain dashboard workflow; starting a Hardhat node does not change the UI or fixed Oracle configuration.

## Manual demo

1. Check the configured Factory has code on Sepolia, or deploy your own.
2. Use three distinct test wallets for employer, contractor, and arbiter.
3. Connect employer and create a positive-budget project in **manual mode**.
4. Submit one release vote; confirm state remains funded.
5. Switch wallets, reconnect, and submit a second vote from another role.
6. Confirm completion and contractor payout on-chain.
7. Use another project for two refund votes and employer refund.

Wallet/network changes reset the client connection; reconnect afterwards. This is not a replacement for automated escrow tests.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Connection fails | Injected wallet, accepted prompts, browser console |
| Read/decode failure | Sepolia, deployed Factory bytecode, matching ABI/address |
| Creation fails | Test ETH, positive budget, valid and distinct roles |
| Oracle fails | Experimental; escrow LINK, node/job, and API policy |
| Token deploy rejects network | Script deliberately permits only Sepolia |
| Backend `npm test` fails | Placeholder script; use `npx hardhat test` |
| Bundle warning | Build succeeds; splitting is future work |

Never paste keys, recovery phrases, `.env`, or RPC credentials into issues.