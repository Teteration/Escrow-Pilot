# Project status and continuation guide

Last reviewed: October 7, 2026. Code baseline: `886108a` on `main`.
This is a repository handover, not an audit or a guarantee of deployed behavior.
Read this first when continuing on another computer or in a new assistant session.

## Project summary

TrustDApp is a testnet escrow pilot/MVP built with Solidity, Hardhat, React/Vite,
and Ethers v6. A Factory deploys isolated ETH escrow contracts. Employer,
contractor, and manual arbiter provide two matching votes to release funds to
the contractor or refund the employer. It is not ready for production funds.

The current version keeps manual arbitration as its practical primary path.
The experimental Oracle option remains visible at the user's request; do not
remove it merely because live fulfillment has not been verified.

## Completed work

- Standalone OpenZeppelin ERC-20: TrustDApp Token / TRUST, 18 decimals, fixed
  initial supply of 100 million minted to the deployer. No external mint or burn
  functions. Separate deployment/export script and five local tests.
- TRUST balance display was added and then intentionally removed. The DApp has
  no TRUST fees, token payments, approvals, or vesting integration.
- Revised Oracle callback registers one vote, not an immediate settlement.
  Oracle plus either human participant, or employer plus contractor, can reach
  two matching votes. This applies to release and refund. Duplicate/conflicting
  Oracle responses cannot add votes. Twenty focused local regressions exist.
- Legacy request job output changed to `uint256`, with `times=1`; request/status
  script added. These changes did not establish live node availability.
- Responsive dark dashboard, wider-screen workspace and small-screen project
  cards; factory-wide statistics, participant details and Etherscan links.
- Wallet disconnect/account-selection controls and account-change handling;
  network changes reset the session. Green connection indicator respects
  reduced-motion preferences. Only injected `window.ethereum` is supported.
- Oracle UI: HTTPS API URL, numeric JSON field path, submission/vote feedback,
  refresh and cost/availability warnings. Settings are page-local and not fixed
  on-chain. API values mean `1 = release`, `2 = refund`.
- Persian/English selection, local preference persistence, RTL/LTR direction and
  translated application copy. Switching language preserves wallet/form state.
  External provider errors and blockchain identifiers remain unchanged.
- Documentation, MIT license, contribution/security guides and environment example.
- Separate CRE TypeScript prototype: validates API decisions and has successfully
  simulated an HTTP fetch. It submits no authenticated report, escrow vote or
  transaction. Its three validation tests and typecheck passed.

## Live deployments are not interchangeable

The checked-in frontend address map still references Factory
`0x8D69340A430cC53553c533741DD17A362c6E6d58`.
Do not assume its escrows implement the revised Oracle vote behavior.

A newer Factory `0xB4FB695ECF5dff94f974bAB5671EE699B05F1D2F` and escrow
`0xD9d2F3230caAfa32cC116BAAa3CA0dE675A310a2` were used for a separate live
test. At the last recorded observation, the escrow held 0.0001 Sepolia ETH,
had one employer release vote and no Oracle vote. This is historical evidence,
not a current balance check. A later valid release callback could settle it.

See [live-test evidence](oracle-live-test.md) for transaction hashes and bounds
of the observations. No successful live fulfillment was verified; do not claim
the cause was proven, or that moving to mainnet will automatically fix it.

## CRE decision and access

Deployment access was requested. The user reported an invitation to discuss
commercial terms and an MNDA; enabled deployment access has not been confirmed.
Do not record account identifiers, login tokens or private correspondence here.
CRE development is paused pending a deliberate decision on access and scope.
Keep the prototype isolated; do not silently replace the existing integration.

## Remaining work, in priority order

1. Manually accept Persian and English layouts at desktop/mobile widths: selector
   persistence, RTL/LTR, long copy, addresses, form state and no horizontal overflow.
2. Check real-wallet connection, account selection, account changes, disconnect
   and permission revocation, rejection and network switching. These depend on
   the wallet and have not been comprehensively verified in a browser.
3. Verify the selected Factory deployment and ABI compatibility before demos;
   document an intentional deployment/address change rather than silently editing it.
4. Expand Factory/manual escrow and adversarial tests, measure coverage and add
   secret-free CI. The user previously deferred this work; agree on resuming it.
5. Extract UI components/hooks/services, improve error handling/accessibility and
   publish real screenshots or a walkthrough after acceptance testing.
6. Revisit authenticated Oracle delivery, agreed data sources, project binding,
   replay protection and production security only as a separate approved phase.

Comprehensive tests, CI, security audit, mainnet release, vesting and token
integration remain unfinished. See [roadmap](roadmap.md) and [testing](testing.md).

## Continue on a home laptop

Clone `Teteration/Escrow-Pilot`, or pull `main` in an existing clean clone. Confirm
the handover commit has been pushed before expecting this file on another machine.
Use [local development](local-development.md) for dependencies and commands:

```bash
cd escrow-pilot
npm ci
npx hardhat compile
npx hardhat test
cd ../frontend
npm ci
npm run lint
npm run build
npm run dev
```

No private key is required for local tests, lint or build. The local Vite UI
still interacts with Sepolia, not automatically with a local Hardhat node.
Use a dedicated test wallet if deployment is needed. Never copy secrets into
Git, documentation, frontend code or chat. CRE CLI authentication is separate
from the repository; re-establish it locally only if resuming CRE work.

The company computer's chat history and temporary diagnostic scripts under
`/tmp` are not part of the repository. Preserve durable evidence in documentation,
not by assuming another assistant session has access to those files.

## Collaboration preferences

- Use concise Persian responses, no tables unless necessary; separate English
  identifiers from Persian paragraphs to improve chat readability.
- Inspect the current code and changes before implementing; summarize the plan.
- Run relevant checks and distinguish successful checks from unverified behavior.
- Suggest a commit when a coherent, validated change is ready. Commit and push
  only after explicit user approval; never force-push without separate agreement.
- Do not include the unrelated industrial proposal in repository changes.
- Do not change contract logic, integrate TRUST, or migrate Oracle implicitly
  during UI/documentation work. Explain the scope and obtain approval first.

Suggested opening message for a new session:

> Read docs/project-handover.md, README.md and docs/roadmap.md. Inspect the current
> Git status and code before continuing. Do not commit, push or send transactions
> without my approval. Explain the next proposed step in concise Persian.