# TrustDApp CRE status prototype

Isolated, read-only CRE experiment. It does not interact with the current escrow,
sign reports, submit votes, or broadcast transactions. TRUST remains independent.

## Prerequisites and commands

Verified on 2026-10-07 with CRE CLI 1.37.0, Bun 1.4.2, and SDK 1.23.0.
From the project root:

```bash
cd /home/nox/blockChainProj/cre-oracle
export PATH="$HOME/.bun/bin:$HOME/.cre/bin:$PATH"
bun install --cwd status-check --frozen-lockfile
cd status-check
bun run typecheck
bun test
cd ..
cre workflow simulate status-check --target staging-settings --trigger-index 0 --non-interactive
```

No wallet key is required. Do not add `--broadcast` or copy the backend private key.
The registry is `private`, matching the account's available registry; this does
not grant deployment permission. The generated production target is also a
simulation-only configuration, NOT production-ready.

## Behavior and observed result

A cron trigger requests the configured HTTPS API through the CRE HTTP capability.
Only numeric `{ "status": 1 }` (release) or `{ "status": 2 }` (refund) is accepted.
The workflow requests identical-result aggregation and returns the decision.
Malformed payloads and HTTP failures stop execution rather than implying approval.

On 2026-10-07 the staging API returned decision **1** in a successful compiled
WASM simulation. This is a real HTTP fetch in a local simulator, not a DON
execution or an on-chain fulfillment. Three validation tests and TypeScript
checking passed. Tests do not establish network reliability or cover a receiver.

## Trust boundaries and next steps

The public mock API is untrusted demo data, not proof of task completion.
No escrow identity is bound to the response. Before integration we need a
project-bound payload, source policy, replay protection, authenticated report
receiver, and tests. A receiver must count one oracle vote only; release/refund
still requires a second matching human vote. Legacy Chainlink callbacks cannot
be reused as CRE report receivers without redesign.

Deployment approval is pending. No contracts or frontend deployment addresses
were changed by this prototype.

Official references:
- https://docs.chain.link/cre/overview
- https://docs.chain.link/cre/reference/sdk/http-client-ts
