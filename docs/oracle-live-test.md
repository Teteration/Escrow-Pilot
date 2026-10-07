# Sepolia Oracle investigation — 2026-10-07

Source commit: `5670677`. No mock callback or public bypass was used in this live test.

## Deployment and transactions

- Factory: `0xB4FB695ECF5dff94f974bAB5671EE699B05F1D2F`
- Escrow: `0xD9d2F3230caAfa32cC116BAAa3CA0dE675A310a2`
- Budget: 0.0001 Sepolia ETH; Oracle fee: 0.1 Sepolia LINK.
- Factory deployment: `0x8fc8505c3010fc99b1cdd20515d37ad1ec483b66516780ee5726226606c66f57`
- Escrow creation: `0x60e4c0cce2ddf9a179817cfd50a79aaf4a0e82b7cada2168b63d1e64ea14408f`
- LINK deposit: `0xc2c477505f68877b768f13cf9240f2da864c73127d78e210c998d17486115d3a`
- Oracle request: `0x73bd6723220446881bacda46dc8e3345b7ff403c8ace8663ea2413a258b30f37`
- Request ID: `0x13a01242c2d9a0fb7f1bdb7187219bd6bc48a7f37f35a3697e44c26256f0c3a5`
- Employer release vote: `0x4517c8a2a11faad3728f377d673b1ca86efe1ad2d238f6c9a2051b60991210b7`

## Observed evidence

The public API returned `{"status":1}`. The operator's `OracleRequest` event decoded to job `ca98366cc7314957b8c012c72f05aeeb`, the correct escrow callback, 0.1 LINK payment, JSON path `status`, and multiplier `times=1`.

The employer vote was confirmed in block 11862906. State remained FUNDED, release votes were 1, Oracle decision was 0, and the escrow retained 0.0001 ETH. No matching successful OracleResponse was observed during the subsequent diagnostics. A reverted callback attempt is not excluded by the absence of events.

At head block 11862946, the public operator's authorized sender was `0xC17E438701E6179844579FB557a53C1e80a9adB6`, with approximately 28.5966 ETH. No OracleResponse events were returned over blocks 11858946–11862946. This does not support an insufficient-ETH explanation at that observation time, but does not prove a specific off-chain failure cause.

## Service lifecycle and next step

Chainlink's official changelog dated May 13, 2026 announces Direct Request deprecation after Node version 2.47. The Any API documentation is now a historical reference and recommends CRE for new work. CRE workflow deployment requires account approval; more LINK alone does not provide deploy access or revive an inactive job.

Do not describe the live integration as successful: only request submission and the single-human-vote invariant were verified live. Oracle-plus-human settlement was verified locally with test mocks, not through the public node.

Choose a supported integration after reviewing account access and receiver authentication. A privately operated API relayer would be a centralized service, not a Chainlink DON. Running a compatible legacy node would be a deliberately temporary, deprecated integration. Existing escrow addresses and the frontend's configured Factory were not replaced by this investigation.

The original request can still potentially be fulfilled later; with the employer release vote already present, decision 1 would complete settlement. No additional request should be submitted casually without considering this existing pending request.

## Official references

- [Direct Request deprecation announcement](https://dev.chain.link/changelog/deprecating-support-for-flux-monitor-direct-request-and-run-log)
- [CRE overview and deployment access requirements](https://docs.chain.link/cre/overview)
- [Workflow deployment guide](https://docs.chain.link/cre/guides/operations/deploying-workflows)