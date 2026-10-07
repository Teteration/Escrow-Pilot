# ADR 0001: Keep TRUST separate from escrow

- **Status:** accepted
- **Date:** 2026-10-07

## Context

A token experiment exists, but the DApp must operate independently of token ownership, transfers, approvals, and fees.

## Decision

Keep TRUST as a standalone fixed-supply ERC-20 with separate deployment/tests. Do not import it into the client, display its balance, charge token fees, or alter escrow contracts for it.

## Consequences

Escrow uses ETH, not TRUST. Exported token ABI/address metadata is not integration. Future use needs a new decision covering economics, permissions, security, migration, and testing.