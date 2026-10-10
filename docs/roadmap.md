# Roadmap

Prioritized backlog, not release promises.

For the current decisions, validation gaps and cross-computer continuation steps,
start with the [project handover](project-handover.md). Manual arbitration remains
the primary demo path; keep the experimental Oracle option visible. CRE deployment
and further integration are paused pending access/scope decisions.

## Phase 1: presentation

- [x] Accurate README, architecture, setup, deployment, risks, and token separation.
- [x] Contribution/security guidance and environment example.
- [x] Remove duplicate exports and unused template assets.
- [ ] Real screenshots and recorded walkthrough.
- [ ] Hosted demo and verified deployment ledger.

## Phase 2: evidence

- [ ] Backend compile/test scripts instead of placeholders.
- [x] Focused Oracle voting regressions and test-only LINK/node mocks (20 tests).
- [ ] Comprehensive Factory/escrow tests and adversarial cases beyond those regressions.
- [ ] Frontend tests and CI compile/test/lint/build.
- [ ] Measure coverage; publish only measured results.

## Phase 3: maintainability

- [x] Add persisted light/dark appearance selection (visual acceptance pending).
- [x] Implement mobile/QR WalletConnect, staged connection feedback, independent RPC reads, and differentiated disconnect notices (cross-device acceptance pending).
- [ ] Consolidate appearance in one dropdown; retain current palette and add previous navy/blue palette with light/dark variants.

- [x] Add Persian/English selection, persistent language preference, and RTL/LTR direction switching.

- [x] Implement responsive RTL workspace and smaller-screen project cards (visual acceptance pending).
- [x] Add dashboard statistics, participant details, and explorer links.
- [x] Add disconnect/account-selection controls, session resets, and reduced-motion-aware connection indicator.
- [x] Expose experimental Oracle API/request/vote controls with funding and availability warnings.
- [x] Remove inherited fixed-width Vite root styles.
- [ ] Extract wallet/escrow hooks, services, and components.
- [ ] User-facing transaction/network errors and resilient async reads.
- [ ] Listing strategy, accessibility review, and desktop/mobile visual acceptance.
- [ ] Verify real-wallet switching and permission revocation; consider multi-provider discovery.

## Phase 4: contract review

- [ ] Destination validation, payout failures, timeout/recovery policy.
- [ ] Competing-vote semantics and legacy bypass retirement.
- [ ] Oracle trust, funding, lifecycle, failures, and network configuration.
- [ ] Safer deployment export handling.

## Future research

Token integration and vesting require separate design, review, tests, and approval. TRUST remains outside escrow payments/fees. No token economics or mainnet readiness is promised.