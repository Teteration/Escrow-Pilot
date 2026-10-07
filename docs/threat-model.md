# Threat model and limitations

**Preliminary review notes, not an audit. Testnet-only; never use real funds.**

## Assets and boundaries

ETH in each escrow, settlement authority, wallet signing, contract configuration, LINK request funding, external APIs, Oracle callbacks, deployment secrets, and generated exports are relevant trust boundaries.

Manual mode trusts a two-person coalition: any two roles can resolve against the third. The contract cannot judge off-chain work or guarantee arbiter neutrality.

## Known risks

| Risk | Current limitation |
| --- | --- |
| Destination validation | Zero-address validation incomplete; distinct roles alone do not ensure safe payout |
| Stuck funds | No deadline or unilateral recovery; non-cooperation can lock ETH |
| Rejecting recipient | Direct ETH call can fail and block settlement |
| Competing outcomes | Independent release/refund votes; first threshold wins |
| Oracle trust | Caller supplies URL/path; authenticated callback does not prove neutral business outcome |
| Oracle availability | Fixed node/job unverified; LINK manual; requests may fail or remain pending |
| Oracle precedence | Decisions settle without second participant approval |
| Legacy bypass | `EscrowOracle.forceOracleApproval` unrestricted; do not deploy for escrow use |
| Scaling | Unbounded listing and sequential client reads |
| Configuration | Wrong address/ABI/network; Factory export overwrites map |
| Evidence gap | No escrow/Oracle test suites or independent audit |

State updates precede outbound calls and failed transfers revert. Adversarial testing is still required; this is not a complete safety argument.

## Before considering production

Specify arbitration/data-source trust; validate destinations; retire or isolate bypass code; design timeout/recovery; test malicious recipients and competing votes; mock Oracle failures; add CI/dependency review; obtain independent contract review. These are planned, not completed mitigations.

## Secrets

Use disposable test wallets. `.env` is ignored and the example has no real key. Ignore rules do not remove already committed secrets. Retire an exposed key; deleting a file does not revoke it or remove Git history.