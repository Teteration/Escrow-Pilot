// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

// ==========================================
// 1. قرارداد اصلی TrustEscrow (هیبریدی)
// ==========================================
contract TrustEscrow is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    address public employer;
    address public contractor;
    address public arbiter; // اگر حالت دستی باشد، آدرس شخص است. در حالت اوراکل بی‌اثر می‌شود.
    
    uint256 public budget;
    bool public isOracleMode; // کلید انتخاب مسیر (دستی یا اتوماتیک)

    enum State { FUNDED, COMPLETED, REFUNDED }
    State public currentState;

    uint8 public releaseApprovals;
    uint8 public refundApprovals;

    // First valid Oracle response is one immutable vote: 0=none, 1=release, 2=refund.
    uint8 public oracleDecision;

    mapping(address => bool) public hasApprovedRelease;
    mapping(address => bool) public hasApprovedRefund;

    // متغیرهای شبکه چین‌لینک
    bytes32 private jobId;
    uint256 private fee;

    event ApprovedRelease(address indexed signer, uint8 totalApprovals);
    event ApprovedRefund(address indexed signer, uint8 totalApprovals);
    event FundsReleased(address indexed contractor, uint256 amount);
    event FundsRefunded(address indexed employer, uint256 amount);
    event OracleRequested(bytes32 indexed requestId);
    event OracleVoteRecorded(bytes32 indexed requestId, uint8 decision, uint8 totalApprovals);
    event OracleResponseIgnored(bytes32 indexed requestId, uint256 decision);

    modifier inState(State _state) {
        require(currentState == _state, "Invalid state for this action");
        _;
    }

    // مقداردهی اولیه توسط Factory انجام می‌شود
    constructor(
        address _employer, 
        address _contractor, 
        address _arbiter, 
        bool _isOracleMode,
        address _linkToken,
        address _oracleAddress
    ) payable {
        require(msg.value > 0, "Budget must be greater than 0");
        // جلوگیری از تداخل نقش‌ها (جلوگیری از باگ امضای تکراری)
        require(_employer != _contractor, "Employer and Contractor cannot be the same");
        
        if (!_isOracleMode) {
            require(_arbiter != _employer && _arbiter != _contractor, "Arbiter must be a neutral third party");
        }
        
        employer = _employer;
        contractor = _contractor;
        arbiter = _isOracleMode ? address(0) : _arbiter;
        isOracleMode = _isOracleMode;
        budget = msg.value;
        currentState = State.FUNDED;

        // تنظیمات چین‌لینک برای زمانی که حالت اوراکل فعال باشد
        if (isOracleMode) {
            setChainlinkToken(_linkToken);
            setChainlinkOracle(_oracleAddress);
            jobId = "ca98366cc7314957b8c012c72f05aeeb"; // GET > uint256
            fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
        }
    }

    // ==========================================
    // منطق اول: تایید آزادسازی وجه (تسویه)
    // ==========================================
    function approveRelease() external inState(State.FUNDED) {
        require(msg.sender == employer || msg.sender == contractor || msg.sender == arbiter, "Not authorized");
        
        // کنترل دسترسی حیاتی: اگر حالت اوراکل فعال باشد، ناظر دستی حق تایید ندارد!
        if (msg.sender == arbiter) {
            require(!isOracleMode, "Arbiter is automated! Manual approval locked.");
        }
        
        require(!hasApprovedRelease[msg.sender], "Already approved release");
        
        hasApprovedRelease[msg.sender] = true;
        releaseApprovals++;
        emit ApprovedRelease(msg.sender, releaseApprovals);

        if (releaseApprovals >= 2) {
            _executeRelease();
        }
    }

    // ==========================================
    // منطق دوم: تایید لغو پروژه (بازگشت وجه)
    // ==========================================
    function approveRefund() external inState(State.FUNDED) {
        require(msg.sender == employer || msg.sender == contractor || msg.sender == arbiter, "Not authorized");
        
        // کنترل دسترسی حیاتی
        if (msg.sender == arbiter) {
            require(!isOracleMode, "Arbiter is automated! Manual refund locked.");
        }

        require(!hasApprovedRefund[msg.sender], "Already approved refund");
        
        hasApprovedRefund[msg.sender] = true;
        refundApprovals++;
        emit ApprovedRefund(msg.sender, refundApprovals);

        if (refundApprovals >= 2) {
            _executeRefund();
        }
    }

    // ==========================================
    // منطق سوم: مسیر اوراکل (اتوماتیک)
    // ==========================================
    // کارفرما یا پیمانکار می‌توانند از API تقاضای داوری کنند
    function requestOracleDecision(string memory apiUrl, string memory path) external inState(State.FUNDED) returns (bytes32 requestId) {
        require(isOracleMode, "Contract is in manual mode! Oracle disabled.");
        require(msg.sender == employer || msg.sender == contractor, "Only parties can request");
        require(oracleDecision == 0, "Oracle already voted");
        require(bytes(apiUrl).length > 0 && bytes(path).length > 0, "Missing API URL or path");

        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);
        req.add("get", apiUrl);
        req.add("path", path); // مثلاً وضعیت پروژه در دیتابیس شما (1 = تسویه، 2 = لغو)
        req.addInt("times", 1); // Required by the uint256 job; preserve integer decisions.
        
        requestId = sendChainlinkRequest(req, fee);
        emit OracleRequested(requestId);
        return requestId;
    }

    // تابعی که شبکه چین‌لینک جواب را به آن برمی‌گرداند
    function fulfill(bytes32 _requestId, uint256 _decision) public recordChainlinkFulfillment(_requestId) {
        // Consume authenticated late/duplicate/invalid responses without adding votes.
        if (currentState != State.FUNDED || oracleDecision != 0 || (_decision != 1 && _decision != 2)) {
            emit OracleResponseIgnored(_requestId, _decision);
            return;
        }

        oracleDecision = uint8(_decision);
        if (_decision == 1) {
            releaseApprovals++;
            emit OracleVoteRecorded(_requestId, 1, releaseApprovals);
            if (releaseApprovals >= 2) _executeRelease();
        } else {
            refundApprovals++;
            emit OracleVoteRecorded(_requestId, 2, refundApprovals);
            if (refundApprovals >= 2) _executeRefund();
        }
    }

    // ==========================================
    // توابع داخلی اعدام (تغییر وضعیت و انتقال پول)
    // ==========================================
    function _executeRelease() internal {
        currentState = State.COMPLETED;
        (bool success, ) = contractor.call{value: budget}("");
        require(success, "Transfer failed");
        emit FundsReleased(contractor, budget);
    }

    function _executeRefund() internal {
        currentState = State.REFUNDED;
        (bool success, ) = employer.call{value: budget}("");
        require(success, "Refund failed");
        emit FundsRefunded(employer, budget);
    }
}


// ==========================================
// 2. قرارداد کارخانه (Escrow Factory)
// ==========================================
contract EscrowFactory {
    TrustEscrow[] public deployedEscrows;
    
    // آدرس‌های ثابت شبکه Sepolia برای چین‌لینک
    address constant LINK_TOKEN = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address constant ORACLE_ADDRESS = 0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD;

    event EscrowCreated(address indexed escrowAddress, address indexed employer, bool isOracleMode);

    // ساخت یک پروژه جدید توسط کاربر
    function createEscrow(address _contractor, address _arbiter, bool _isOracleMode) external payable {
        require(msg.value > 0, "Budget must be > 0");

        TrustEscrow newEscrow = new TrustEscrow{value: msg.value}(
            msg.sender,
            _contractor,
            _arbiter,
            _isOracleMode,
            LINK_TOKEN,
            ORACLE_ADDRESS
        );

        deployedEscrows.push(newEscrow);
        emit EscrowCreated(address(newEscrow), msg.sender, _isOracleMode);
    }

    function getAllEscrows() external view returns (TrustEscrow[] memory) {
        return deployedEscrows;
    }
}