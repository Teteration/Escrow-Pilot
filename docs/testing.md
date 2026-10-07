# Testing

## Commands

```bash
cd escrow-pilot
npx hardhat compile
npx hardhat test
cd ../frontend
npm run lint
npm run build
```

Backend is ESM; `.cjs` tests load Hardhat/Chai through CommonJS. Backend `npm test` is currently a placeholder. Token tests need no private key or Sepolia.

## Current coverage

Five tests in `escrow-pilot/test/TrustToken.cjs` check metadata/supply/allocation, transfers, allowances, invalid transfers, and absence of external mint/burn functions.

`OracleVoting.cjs` adds 20 focused local regressions with test-only LINK/node mocks: job encoding/payment, human-plus-Oracle votes for both outcomes and orders, forged callbacks, duplicate/conflicting responses, invalid decisions, late responses, human agreement, and all manual role pairs. These do **not** establish live Oracle availability or complete escrow safety. Comprehensive escrow tests, frontend tests, coverage metrics, and CI remain pending. Lint/build are not wallet integration tests.

## Next priorities

- Factory creation, isolated balances, events, positive budgets, role validation.
- Two-of-three resolution, duplicate/unauthorized votes, competing outcomes, terminal states.
- Rejecting recipients and reentrancy attempts with helper contracts.
- Oracle funding, unauthorized callbacks, invalid decisions, pending requests with mocks.
- UI network/account reset, transaction rejection, validation, stale responses.

Separate live Sepolia smoke tests from deterministic tests. CI must not need wallet secrets or a working Oracle job.