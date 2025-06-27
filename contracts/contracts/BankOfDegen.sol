// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BankOfDegen is Ownable, ReentrancyGuard, EIP712 {
    // --- Config ---
    IERC20 public constant degenToken = IERC20(0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed); // DEGEN on Base
    uint256 public constant MAX_CLAIM = 100 * 1e18; // 100 DEGEN (18 decimals)
    uint256 public immutable minVaultBalance;
    uint256 public constant DEV_FEE_PERCENT = 10;
    address public immutable devWallet;
    address public immutable gaslessOperator;
    uint256 public lastPublishedBalance;
    uint256 public lastPublishedTime;

    // Donor tiers (in DEGEN)
    uint256 public constant TIER1_THRESHOLD = 1000 * 1e18; // 1,000 DEGEN
    uint256 public constant TIER2_THRESHOLD = 5000 * 1e18; // 5,000 DEGEN
    uint256 public constant TIER3_THRESHOLD = 10000 * 1e18; // 10,000 DEGEN

    // Leaderboard config
    uint256 public constant LEADERBOARD_SIZE = 100;
    uint256 public claimCooldown = 0;

    // --- Storage ---
    struct DonorInfo {
        uint256 totalDonated;
        uint256 lastDonationTime;
        uint8 tier;
        bool hasClaimed;
    }

    struct LeaderboardEntry {
        address donor;
        uint256 amount;
    }

    mapping(address => DonorInfo) public donors;
    mapping(uint256 => bool) public fidClaimed;
    mapping(uint256 => bool) public fidBlacklisted;
    mapping(address => uint256) public lastClaimAt;
    mapping(address => uint256) public nonces;

    LeaderboardEntry[LEADERBOARD_SIZE] public leaderboard;
    uint256 public minLeaderboardAmount = 0;

    // --- EIP-712 Types ---
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address claimer,uint256 fid,uint256 deadline,uint256 nonce)");

    // --- Events ---
    event Donated(address indexed donor, uint256 amount, uint256 devFee);
    event Claimed(address indexed recipient, uint256 fid, uint256 amount);
    event BlacklistUpdated(uint256[] fids, bool isBlacklisted);
    event DonorTierUpgraded(address indexed donor, uint8 newTier);
    event LeaderboardUpdated(address indexed donor, uint256 amount, uint256 position);
    event GaslessClaimExecuted(address indexed operator, address indexed claimer, uint256 fid);

    constructor(
        uint256 _minVaultBalance,
        address _devWallet,
        address _gaslessOperator
    ) Ownable(msg.sender) EIP712("BankOfDegen", "1") {
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_gaslessOperator != address(0), "Invalid gasless operator");
        minVaultBalance = _minVaultBalance;
        devWallet = _devWallet;
        gaslessOperator = _gaslessOperator;
    }

    // --- Donations ---
    function donate(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero deposit");

        uint256 devFee = (amount * DEV_FEE_PERCENT) / 100;
        uint256 donationAmount = amount - devFee;

        // Transfer DEGEN from donor
        require(degenToken.transferFrom(msg.sender, address(this), amount), "DEGEN transfer failed");

        DonorInfo storage donor = donors[msg.sender];
        donor.totalDonated += donationAmount;
        donor.lastDonationTime = block.timestamp;

        // Update leaderboard if qualified
        if (donationAmount > 0) {
            _updateLeaderboard(msg.sender, donor.totalDonated);
        }

        uint8 newTier = getTier(donor.totalDonated);
        if (newTier > donor.tier) {
            donor.tier = newTier;
            emit DonorTierUpgraded(msg.sender, newTier);
        }

        // Send dev fee
        require(degenToken.transfer(devWallet, devFee), "Dev fee transfer failed");

        emit Donated(msg.sender, donationAmount, devFee);
    }

    // --- Claims ---
    function claim(uint256 fid, uint256 deadline, bytes memory signature) external nonReentrant {
        _validateClaim(msg.sender, fid, deadline, signature);
        _executeClaim(msg.sender, fid);
    }

    function executeGaslessClaim(address claimer, uint256 fid, uint256 deadline, bytes memory signature) 
        external nonReentrant 
    {
        require(msg.sender == gaslessOperator, "Only operator");
        _validateClaim(claimer, fid, deadline, signature);
        _executeClaim(claimer, fid);
    }

    function _validateClaim(address claimer, uint256 fid, uint256 deadline, bytes memory signature) internal {
        require(block.timestamp <= deadline, "Signature expired");
        require(!donors[claimer].hasClaimed, "Already claimed (address)");
        require(!fidClaimed[fid], "Already claimed (FID)");
        require(!fidBlacklisted[fid], "FID blacklisted");
        require(degenToken.balanceOf(address(this)) >= MAX_CLAIM + minVaultBalance, "Vault balance too low");
        if (claimCooldown > 0) {
            require(block.timestamp >= lastClaimAt[claimer] + claimCooldown, "Cooldown not passed");
        }

        // Verify EIP-712 signature
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, claimer, fid, deadline, nonces[claimer]))
        );
        address signer = ECDSA.recover(digest, signature);
        require(signer == claimer, "Invalid signature");
        nonces[claimer]++;
    }

    function _executeClaim(address claimer, uint256 fid) internal {
        DonorInfo storage donor = donors[claimer];
        donor.hasClaimed = true;
        fidClaimed[fid] = true;
        lastClaimAt[claimer] = block.timestamp;

        require(degenToken.transfer(claimer, MAX_CLAIM), "DEGEN transfer failed");

        emit Claimed(claimer, fid, MAX_CLAIM);
        if (msg.sender == gaslessOperator) {
            emit GaslessClaimExecuted(msg.sender, claimer, fid);
        }
    }

    // --- Leaderboard ---
    function _updateLeaderboard(address donor, uint256 newAmount) internal {
        if (newAmount < minLeaderboardAmount && leaderboard[LEADERBOARD_SIZE - 1].amount >= newAmount) {
            return;
        }

        int256 insertPos = -1;
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (newAmount > leaderboard[i].amount) {
                insertPos = int256(i);
                break;
            }
        }

        if (insertPos >= 0) {
            for (uint256 j = LEADERBOARD_SIZE - 1; j > uint256(insertPos); j--) {
                leaderboard[j] = leaderboard[j - 1];
            }
            leaderboard[uint256(insertPos)] = LeaderboardEntry(donor, newAmount);
            minLeaderboardAmount = leaderboard[LEADERBOARD_SIZE - 1].amount;
            emit LeaderboardUpdated(donor, newAmount, uint256(insertPos));
        }
    }

    // --- Admin Functions ---
    function setClaimCooldown(uint256 seconds_) external onlyOwner {
        claimCooldown = seconds_;
    }

    function updateBlacklist(uint256[] calldata fids, bool isBlacklisted) external onlyOwner {
        for (uint256 i = 0; i < fids.length; i++) {
            fidBlacklisted[fids[i]] = isBlacklisted;
        }
        emit BlacklistUpdated(fids, isBlacklisted);
    }

    function sweep(address to, uint256 amount) external onlyOwner nonReentrant {
        require(degenToken.balanceOf(address(this)) - amount >= minVaultBalance, "Cannot sweep below min balance");
        require(degenToken.transfer(to, amount), "Sweep failed");
    }

    // --- View Functions ---
    function getTier(uint256 totalDonated) public pure returns (uint8) {
        if (totalDonated >= TIER3_THRESHOLD) return 3;
        if (totalDonated >= TIER2_THRESHOLD) return 2;
        if (totalDonated >= TIER1_THRESHOLD) return 1;
        return 0;
    }

    function getVaultStatus() external view returns (
        uint256 currentBalance,
        uint256 minReserve,
        uint256 availableForClaims
    ) {
        currentBalance = degenToken.balanceOf(address(this));
        minReserve = minVaultBalance;
        availableForClaims = currentBalance > minReserve ? currentBalance - minReserve : 0;
    }

    // --- Fallback Disabled ---
    receive() external payable {
        revert("Send DEGEN via donate()");
    }
}