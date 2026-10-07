# Contributing

Start with the [README](README.md), [architecture](docs/architecture.md), and [limitations](docs/threat-model.md).

1. Discuss behavior changes before large refactors.
2. Keep PRs focused; separate documentation from contract changes.
3. Follow Solidity 0.8.19, ESM backend, and React/Ethers v6 conventions.
4. Update docs when roles, states, networks, or exports change.
5. Run [validation](docs/testing.md), reporting actual results and skipped checks.
6. Explain motivation, risks, and test evidence in PRs.

Contract behavior needs deterministic tests. Do not use live keys in tests or add dependencies without a need. Never claim audit/coverage guarantees without evidence.

The client must remain independent of TRUST. Do not silently change Escrow/Factory during UI work. The legacy Oracle is an unsafe experiment, not a supported deployment.

Before submitting: compile, test, lint, build, run `git diff --check`, inspect generated JSON, and exclude keys, `.env`, private notes, dependencies, and build outputs. Use [SECURITY.md](SECURITY.md) for sensitive reports.