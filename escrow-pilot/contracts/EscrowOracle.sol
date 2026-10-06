// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

contract EscrowOracle is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    address public employer;
    address public contractor;
    
    bytes32 private jobId;
    uint256 private fee;
    
    mapping(bytes32 => uint256) public requestToMilestone;

    struct Milestone {
        uint256 amount;
        bool isCompleted;
        bool employerApproved;
        bool contractorApproved;
        bool arbiterApproved;
        uint8 approvalCount;
    }
    
    mapping(uint256 => Milestone) public milestones;
    uint256 public milestoneCount;

    event OracleRequestSent(bytes32 indexed requestId, uint256 milestoneId);
    event OracleFulfillment(bytes32 indexed requestId, uint256 result);
    event FundsReleased(uint256 milestoneId, uint256 amount);
    event MilestoneCreated(uint256 id, uint256 amount);

    constructor(address _contractor) ConfirmedOwner(msg.sender) {
        employer = msg.sender;
        contractor = _contractor;

        setChainlinkToken(0x779877A7B0D9E8603169DdbD7836e478b4624789);
        setChainlinkOracle(0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD);
        
        jobId = "ca98366cc7314957b8c012c72f05aeeb";
        fee = (1 * LINK_DIVISIBILITY) / 10;
    }

    function createMilestone(uint256 _amount) external payable {
        require(msg.sender == employer, "Only employer can create milestones");
        require(msg.value == _amount, "Please send exact ETH amount");

        milestoneCount++;
        milestones[milestoneCount] = Milestone({
            amount: _amount,
            isCompleted: false,
            employerApproved: false,
            contractorApproved: false,
            arbiterApproved: false,
            approvalCount: 0
        });
        emit MilestoneCreated(milestoneCount, _amount);
    }

    // اضافه شدن پارامتر dataPath برای داینامیک شدن مسیر JSON
    function requestMilestoneStatus(uint256 _milestoneId, string memory apiUrl, string memory dataPath) public returns (bytes32) {
        Milestone storage m = milestones[_milestoneId];
        require(!m.arbiterApproved, "Arbiter already approved");
        require(!m.isCompleted, "Milestone already completed");

        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        req.add("get", apiUrl);
        req.add("path", dataPath); 
        req.addInt("times", 1); 

        bytes32 requestId = sendChainlinkRequest(req, fee);
        requestToMilestone[requestId] = _milestoneId;
        
        emit OracleRequestSent(requestId, _milestoneId);
        return requestId;
    }

    function fulfill(bytes32 _requestId, uint256 _apiResult) public recordChainlinkFulfillment(_requestId) {
        emit OracleFulfillment(_requestId, _apiResult);
        
        // هر عددی بزرگتر از صفر یعنی دریافت موفقیت‌آمیز دیتا از دنیای واقعی
        if (_apiResult > 0) { 
            uint256 mId = requestToMilestone[_requestId];
            Milestone storage m = milestones[mId];
            
            if (!m.arbiterApproved) {
                m.arbiterApproved = true;
                m.approvalCount++;
            }

            if (m.approvalCount >= 2 && !m.isCompleted) {
                _releaseFunds(mId);
            }
        }
    }

    function approveByEmployer(uint256 _milestoneId) external {
        require(msg.sender == employer, "Only employer");
        Milestone storage m = milestones[_milestoneId];
        require(!m.employerApproved, "Already approved");
        m.employerApproved = true;
        m.approvalCount++;
        if (m.approvalCount >= 2 && !m.isCompleted) {
            _releaseFunds(_milestoneId);
        }
    }

    function _releaseFunds(uint256 _milestoneId) internal {
        Milestone storage m = milestones[_milestoneId];
        m.isCompleted = true;
        (bool success, ) = contractor.call{value: m.amount}("");
        require(success, "Transfer failed");
        emit FundsReleased(_milestoneId, m.amount);
    }
    
    // تابع کمکی برای محیط تستی (بای‌پس کردن نود خراب چین‌لینک)
    function forceOracleApproval(uint256 _milestoneId) external {
        Milestone storage m = milestones[_milestoneId];
        require(!m.arbiterApproved, "Arbiter already approved");
        require(!m.isCompleted, "Milestone already completed");
        
        m.arbiterApproved = true;
        m.approvalCount++;

        if (m.approvalCount >= 2 && !m.isCompleted) {
            _releaseFunds(_milestoneId);
        }
    }
}