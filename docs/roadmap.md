# Roadmap

Prioritized backlog, not release promises.

## Phase 1: presentation

- [x] Accurate README, architecture, setup, deployment, risks, and token separation.
- [x] Contribution/security guidance and environment example.
- [x] Remove duplicate exports and unused template assets.
- [ ] Real screenshots and recorded walkthrough.
- [ ] Hosted demo and verified deployment ledger.

## Phase 2: evidence

- [ ] Backend compile/test scripts instead of placeholders.
- [ ] Factory/escrow tests, adversarial cases, Oracle mocks.
- [ ] Frontend tests and CI compile/test/lint/build.
- [ ] Measure coverage; publish only measured results.

## Phase 3: maintainability

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