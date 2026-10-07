// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only ERC677 stand-in, not a deployable Oracle service.
contract OracleTestLink is ERC20 {
    constructor() ERC20("Test LINK", "tLINK") { _mint(msg.sender, 1000 ether); }

    function transferAndCall(address to, uint256 amount, bytes calldata data) external returns (bool) {
        _transfer(msg.sender, to, amount);
        OracleTestNode(to).onTokenTransfer(msg.sender, amount, data);
        return true;
    }
}

/// @dev Test-only node that records encoded requests and fulfills as the authorized address.
contract OracleTestNode {
    address public immutable link;
    address public immutable owner;
    struct Request { address callback; bytes4 selector; }
    mapping(bytes32 => Request) public requests;
    bytes32 public lastRequestId;
    bytes32 public lastJobId;
    bytes public lastData;

    constructor(address token) { link = token; owner = msg.sender; }

    function onTokenTransfer(address sender, uint256, bytes calldata encoded) external {
        require(msg.sender == link, "Only test LINK");
        (, , bytes32 job, address callback, bytes4 selector, uint256 nonce, , bytes memory data) =
            abi.decode(encoded[4:], (address, uint256, bytes32, address, bytes4, uint256, uint256, bytes));
        bytes32 id = keccak256(abi.encodePacked(sender, nonce));
        requests[id] = Request(callback, selector);
        lastRequestId = id;
        lastJobId = job;
        lastData = data;
    }

    function respond(bytes32 id, uint256 decision) external {
        require(msg.sender == owner, "Only test owner");
        Request memory request = requests[id];
        require(request.callback != address(0), "Unknown request");
        (bool success, bytes memory result) = request.callback.call(abi.encodeWithSelector(request.selector, id, decision));
        if (!success) assembly { revert(add(result, 32), mload(result)) }
    }
}