// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Standalone fixed-supply token, independent of escrow operations.
contract TrustToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10 ** 18;

    constructor() ERC20("TrustDApp Token", "TRUST") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}