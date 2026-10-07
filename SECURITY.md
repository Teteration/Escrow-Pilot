# Security policy

## Status

Unaudited Sepolia prototype. No version approved for production, mainnet, or real funds. Maintenance is best-effort; no response-time guarantee. Legacy `EscrowOracle.sol` is not a supported escrow deployment. See [known limitations](docs/threat-model.md).

## Reporting

If GitHub's Security tab offers **Report a vulnerability**, use that private route. Availability depends on settings and has not been verified/enabled here.

Otherwise, open a minimal issue asking the maintainer to arrange confidential contact. Do not publicly include exploit instructions, unpatched vulnerability details, user data, or secrets. No dedicated security email is configured.

Once a private channel is agreed, provide affected commits/contracts, test-only reproduction, impact, and suggested fix. Do not attack other users' escrows or use real funds. Coordinate disclosure before publishing a working exploit.

## Exposed keys

Treat leaked keys as compromised and stop using the wallet. Deleting `.env` does not revoke a key or remove Git history.