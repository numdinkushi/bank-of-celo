// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title BankOfCelo
 * @notice Enhanced with leaderboard functionality and donor perks
 */
contract BankOfCelo is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // --- Config ---
    uint256 public constant MAX_CLAIM = 0.5 ether;
    uint256 public immutable minVaultBalance;
    uint256 public constant DEV_FEE_PERCENT = 5;
    address public immutable devWallet;

    // Donor tiers (in CELO)
    uint256 public constant TIER1_THRESHOLD = 10 ether;
    uint256 public constant TIER2_THRESHOLD = 50 ether;
    uint256 public constant TIER3_THRESHOLD = 100 ether;

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

    LeaderboardEntry[LEADERBOARD_SIZE] public leaderboard;
    uint256 public minLeaderboardAmount = 0;

    // --- Events ---
    event Donated(address indexed donor, uint256 amount, uint256 devFee);
    event Claimed(address indexed recipient, uint256 fid, uint256 amount);
    event BlacklistUpdated(uint256[] fids, bool isBlacklisted);
    event DonorTierUpgraded(address indexed donor, uint8 newTier);
    event LeaderboardUpdated(address indexed donor, uint256 amount, uint256 position);

    constructor(uint256 _minVaultBalance, address _devWallet)
        payable
        Ownable(msg.sender)
    {
        require(_devWallet != address(0), "Invalid dev wallet");
        minVaultBalance = _minVaultBalance;
        devWallet = _devWallet;
    }

    // --- Donations ---
    function donate() external payable nonReentrant {
        require(msg.value > 0, "Zero deposit");
        
        uint256 devFee = msg.value.mul(DEV_FEE_PERCENT).div(100);
        uint256 donationAmount = msg.value.sub(devFee);

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

        (bool feeSuccess, ) = devWallet.call{value: devFee}("");
        require(feeSuccess, "Dev fee transfer failed");

        emit Donated(msg.sender, donationAmount, devFee);
    }

    // --- Leaderboard Management ---
    function _updateLeaderboard(address donor, uint256 newAmount) internal {
        // Don't update if amount is too small
        if (newAmount < minLeaderboardAmount && 
            leaderboard[LEADERBOARD_SIZE-1].amount >= newAmount) {
            return;
        }

        // Find insertion point
        int256 insertPos = -1;
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (newAmount > leaderboard[i].amount) {
                insertPos = int256(i);
                break;
            }
        }

        // Shift entries down and insert new donor
        if (insertPos >= 0) {
            // Shift elements down
            for (uint256 j = LEADERBOARD_SIZE-1; j > uint256(insertPos); j--) {
                leaderboard[j] = leaderboard[j-1];
            }
            
            // Insert new entry
            leaderboard[uint256(insertPos)] = LeaderboardEntry(donor, newAmount);
            minLeaderboardAmount = leaderboard[LEADERBOARD_SIZE-1].amount;
            
            emit LeaderboardUpdated(donor, newAmount, uint256(insertPos));
        }
    }

    // --- View Functions for Leaderboard ---
    function getLeaderboard() external view returns (LeaderboardEntry[] memory) {
        LeaderboardEntry[] memory currentLeaderboard = new LeaderboardEntry[](LEADERBOARD_SIZE);
        
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            currentLeaderboard[i] = leaderboard[i];
        }
        
        return currentLeaderboard;
    }

    function getDonorRank(address donor) external view returns (uint256) {
        uint256 donorAmount = donors[donor].totalDonated;
        if (donorAmount == 0) return type(uint256).max; // Not on leaderboard
        
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (leaderboard[i].donor == donor) {
                return i + 1; // 1-based ranking
            }
        }
        
        return type(uint256).max; // Not in top 100
    }

    // --- Claim Function ---
    function claim(uint256 fid) external nonReentrant {
        require(tx.origin == msg.sender, "Contracts not allowed");
        DonorInfo storage donor = donors[msg.sender];
        require(!donor.hasClaimed, "Already claimed (address)");
        require(!fidClaimed[fid], "Already claimed (FID)");
        require(!fidBlacklisted[fid], "FID blacklisted");
        require(address(this).balance >= MAX_CLAIM + minVaultBalance, "Vault balance too low");

        if (claimCooldown > 0) {
            require(block.timestamp - lastClaimAt[msg.sender] >= claimCooldown, "Cooldown not passed");
        }

        donor.hasClaimed = true;
        fidClaimed[fid] = true;
        lastClaimAt[msg.sender] = block.timestamp;

        (bool ok, ) = msg.sender.call{value: MAX_CLAIM}("");
        require(ok, "CELO transfer failed");

        emit Claimed(msg.sender, fid, MAX_CLAIM);
    }

    // --- Admin Functions ---
    function setClaimCooldown(uint256 seconds_) external onlyOwner {
        claimCooldown = seconds_;
    }

    function updateBlacklist(uint256[] calldata fids, bool isBlacklisted) external onlyOwner {
        for (uint256 i = 0; i < fids.length; ++i) {
            fidBlacklisted[fids[i]] = isBlacklisted;
        }
        emit BlacklistUpdated(fids, isBlacklisted);
    }

    function sweep(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance - amount >= minVaultBalance, "Cannot sweep below min balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Sweep failed");
    }

    // --- Donor Utilities ---
    function getTier(uint256 totalDonated) public pure returns (uint8) {
        if (totalDonated >= TIER3_THRESHOLD) return 3;
        if (totalDonated >= TIER2_THRESHOLD) return 2;
        if (totalDonated >= TIER1_THRESHOLD) return 1;
        return 0;
    }

    function getDonorTier(address donor) external view returns (uint8) {
        return donors[donor].tier;
    }

    // --- Fallback ---
    receive() external payable {
        uint256 devFee = msg.value.mul(DEV_FEE_PERCENT).div(100);
        uint256 donationAmount = msg.value.sub(devFee);

        DonorInfo storage donor = donors[msg.sender];
        donor.totalDonated += donationAmount;
        donor.lastDonationTime = block.timestamp;

        if (donationAmount > 0) {
            _updateLeaderboard(msg.sender, donor.totalDonated);
        }

        (bool feeSuccess, ) = devWallet.call{value: devFee}("");
        require(feeSuccess, "Dev fee transfer failed");

        emit Donated(msg.sender, donationAmount, devFee);
    }
}