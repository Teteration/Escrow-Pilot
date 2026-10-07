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

- [ ] Extract wallet/escrow hooks, services, and components.
- [ ] User-facing transaction/network errors and resilient async reads.
- [ ] Listing strategy and accessibility/mobile improvements.
- [ ] Remove inherited Vite styles with visual checks.

## Phase 4: contract review

- [ ] Destination validation, payout failures, timeout/recovery policy.
- [ ] Competing-vote semantics and legacy bypass retirement.
- [ ] Oracle trust, funding, lifecycle, failures, and network configuration.
- [ ] Safer deployment export handling.

## Future research

Token integration and vesting require separate design, review, tests, and approval. TRUST remains outside escrow payments/fees. No token economics or mainnet readiness is promised.