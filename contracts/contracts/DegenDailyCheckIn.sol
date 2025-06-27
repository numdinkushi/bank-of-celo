// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DegenDailyCheckIn {
    address public admin;
    uint256 public currentRound;
    uint256 public rewardAmount;
    address public trustedSigner;
    uint256 public checkInFee = 1 * 1e18; // 1 DEGEN (18 decimals)
    address[] public allParticipants;
    mapping(address => bool) public isParticipant;

    IERC20 public constant degenToken = IERC20(0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed); // DEGEN on Base

    struct Round {
        uint256 startTime;
        bool isActive;
        uint256 participantCount;
        uint256 totalCheckIns;
        uint256 duration; // In days
    }

    struct UserRoundData {
        uint256 checkInCount;
        bool hasClaimed;
    }

    // Storage
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public dailyCheckIns;
    mapping(uint256 => mapping(address => UserRoundData)) public userRoundData;
    mapping(uint256 => mapping(uint256 => bool)) public fidUsedInRound;
    mapping(uint256 => mapping(uint256 => address[])) public addressesClaimedPerDay;
    mapping(uint256 => mapping(uint256 => uint256)) public claimCountPerDay;

    // Events
    event CheckedIn(address indexed user, uint256 indexed day, uint256 round);
    event RewardClaimed(address indexed user, uint256 round);
    event FundsDeposited(address indexed depositor, uint256 amount);
    event RoundStarted(uint256 indexed round);
    event RoundEnded(uint256 indexed round);

    constructor(address _trustedSigner) {
        admin = msg.sender;
        trustedSigner = _trustedSigner;
        currentRound = 1;
        rounds[currentRound] = Round(block.timestamp, true, 0, 0, 7); // 7-day round
        emit RoundStarted(currentRound);
    }

    // ========================
    // Signature Verification (Fixed)
    // ========================

    function verifySignature(bytes32 ethSignedMessageHash, bytes memory signature) internal view returns (bool) {
        return recoverSigner(ethSignedMessageHash, signature) == trustedSigner;
    }

    function getEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    // ========================
    // Core User Functions
    // ========================

    function checkIn(uint256 day, bytes memory signature) external {
        require(rounds[currentRound].isActive, "Round inactive");
        require(day >= 1 && day <= 7, "Invalid day");
        require(!dailyCheckIns[currentRound][msg.sender][day], "Already checked in");

        // Transfer 1 DEGEN fee
        require(degenToken.transferFrom(msg.sender, address(this), checkInFee), "DEGEN transfer failed");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, day, currentRound));
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        require(verifySignature(ethSignedMessageHash, signature), "Invalid signature");

        // Track participant
        if (!isParticipant[msg.sender]) {
            isParticipant[msg.sender] = true;
            allParticipants.push(msg.sender);
        }

        // Update state
        if (userRoundData[currentRound][msg.sender].checkInCount == 0) {
            rounds[currentRound].participantCount++;
        }

        dailyCheckIns[currentRound][msg.sender][day] = true;
        userRoundData[currentRound][msg.sender].checkInCount++;
        rounds[currentRound].totalCheckIns++;
        addressesClaimedPerDay[currentRound][day].push(msg.sender);
        claimCountPerDay[currentRound][day]++;

        emit CheckedIn(msg.sender, day, currentRound);
    }

    function claimReward(uint256 fid, bytes memory signature) external {
        require(rounds[currentRound].isActive, "Round inactive");
        require(degenToken.balanceOf(address(this)) >= rewardAmount, "Insufficient DEGEN");
        require(!userRoundData[currentRound][msg.sender].hasClaimed, "Already claimed");
        require(!fidUsedInRound[currentRound][fid], "FID used");
        require(_hasCheckedIn7Days(msg.sender), "Missing check-ins");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, fid, currentRound));
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        require(verifySignature(ethSignedMessageHash, signature), "Invalid signature");

        // Update state and transfer reward
        userRoundData[currentRound][msg.sender].hasClaimed = true;
        fidUsedInRound[currentRound][fid] = true;
        require(degenToken.transfer(msg.sender, rewardAmount), "Reward transfer failed");

        emit RewardClaimed(msg.sender, currentRound);
    }

    // ========================
    // Helper Functions
    // ========================

    function _hasCheckedIn7Days(address user) internal view returns (bool) {
        for (uint256 day = 1; day <= 7; day++) {
            if (!dailyCheckIns[currentRound][user][day]) return false;
        }
        return true;
    }

    function getCurrentDay() public view returns (uint256) {
        uint256 elapsed = block.timestamp - rounds[currentRound].startTime;
        return (elapsed / 86400) + 1; // Days since round start (1-7)
    }

    // ========================
    // Admin Functions
    // ========================

    function depositRewards(uint256 amount) external {
        require(degenToken.transferFrom(msg.sender, address(this), amount), "Deposit failed");
        emit FundsDeposited(msg.sender, amount);
    }

    function setRewardAmount(uint256 newAmount) external onlyAdmin {
        rewardAmount = newAmount;
    }

    function startNewRound() external onlyAdmin {
        currentRound++;
        rounds[currentRound] = Round(block.timestamp, true, 0, 0, 7);
        emit RoundStarted(currentRound);
    }

    function emergencyWithdrawDEGEN() external onlyAdmin {
        uint256 balance = degenToken.balanceOf(address(this));
        require(degenToken.transfer(admin, balance), "Withdrawal failed");
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
}