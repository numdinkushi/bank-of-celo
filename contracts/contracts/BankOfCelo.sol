// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title BankOfCelo
 * @notice Enhanced with gasless claim functionality using EIP-712 signatures
 */
contract BankOfCelo is Ownable, ReentrancyGuard, EIP712 {
    // --- Config ---
    uint256 public constant MAX_CLAIM = 0.5 ether;
    uint256 public immutable minVaultBalance;
    uint256 public constant DEV_FEE_PERCENT = 5;
    address public immutable devWallet;
    uint256 public lastPublishedBalance;
    uint256 public lastPublishedTime;
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

    // --- EIP-712 Types ---
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address claimer,uint256 fid,uint256 deadline)");

    // --- Events ---
    event Donated(address indexed donor, uint256 amount, uint256 devFee);
    event Claimed(address indexed recipient, uint256 fid, uint256 amount);
    event BlacklistUpdated(uint256[] fids, bool isBlacklisted);
    event DonorTierUpgraded(address indexed donor, uint8 newTier);
    event LeaderboardUpdated(address indexed donor, uint256 amount, uint256 position);

    constructor(uint256 _minVaultBalance, address _devWallet)
        payable
        Ownable(msg.sender)
        EIP712("BankOfCelo", "1")
    {
        require(_devWallet != address(0), "Invalid dev wallet");
        minVaultBalance = _minVaultBalance;
        devWallet = _devWallet;
    }

    // --- Donations ---
    function donate() external payable nonReentrant {
        require(msg.value > 0, "Zero deposit");
        
        uint256 devFee = (msg.value * DEV_FEE_PERCENT) / 100;
        uint256 donationAmount = msg.value - devFee;

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

    // --- Gasless Claim ---
    function claimGasless(
        address claimer,
        uint256 fid,
        uint256 deadline,
        bytes memory signature
    ) external nonReentrant {
        require(deadline >= block.timestamp, "Signature expired");
        require(address(this).balance >= MAX_CLAIM + minVaultBalance, "Vault balance too low");

        // Verify EIP-712 signature
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CLAIM_TYPEHASH,
                    claimer,
                    fid,
                    deadline
                )
            )
        );
        address signer = ECDSA.recover(digest, signature);
        require(signer == claimer, "Invalid signature");

        // Validate claim
        DonorInfo storage donor = donors[claimer];
        require(!donor.hasClaimed, "Already claimed (address)");
        require(!fidClaimed[fid], "Already claimed (FID)");
        require(!fidBlacklisted[fid], "FID blacklisted");

        if (claimCooldown > 0) {
            require(block.timestamp - lastClaimAt[claimer] >= claimCooldown, "Cooldown not passed");
        }

        // Update state
        donor.hasClaimed = true;
        fidClaimed[fid] = true;
        lastClaimAt[claimer] = block.timestamp;

        // Send funds to claimer
        (bool ok, ) = claimer.call{value: MAX_CLAIM}("");
        require(ok, "CELO transfer failed");

        emit Claimed(claimer, fid, MAX_CLAIM);
    }

    // --- Original Claim (for backward compatibility) ---
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

    // --- Leaderboard Management ---
    function _updateLeaderboard(address donor, uint256 newAmount) internal {
        if (newAmount < minLeaderboardAmount && 
            leaderboard[LEADERBOARD_SIZE-1].amount >= newAmount) {
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
            for (uint256 j = LEADERBOARD_SIZE-1; j > uint256(insertPos); j--) {
                leaderboard[j] = leaderboard[j-1];
            }
            
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
        if (donorAmount == 0) return type(uint256).max;
        
        for (uint256 i = 0; i < LEADERBOARD_SIZE; i++) {
            if (leaderboard[i].donor == donor) {
                return i + 1;
            }
        }
        
        return type(uint256).max;
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

    function getVaultStatus() external view returns (
        uint256 currentBalance,
        uint256 minReserve,
        uint256 availableForClaims
    ) {
        currentBalance = address(this).balance;
        minReserve = minVaultBalance;
        availableForClaims = currentBalance > minReserve 
            ? currentBalance - minReserve 
            : 0;
    }

    function getFormattedBalance() external view returns (string memory) {
        uint256 balance = address(this).balance;
        uint256 celoAmount = balance / 1 ether;
        uint256 decimals = (balance % 1 ether) / 1e16;
        
        return string(abi.encodePacked(
            Strings.toString(celoAmount),
            ".",
            decimals < 10 ? "0" : "",
            Strings.toString(decimals),
            " CELO"
        ));
    }

    function getBalanceWithAccessControl() external view returns (uint256) {
        require(donors[msg.sender].totalDonated > 0.1 ether, 
            "Only donors can view");
        return address(this).balance;
    }

    // --- Fallback ---
    receive() external payable {
        uint256 devFee = (msg.value * DEV_FEE_PERCENT) / 100;
        uint256 donationAmount = msg.value - devFee;
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

    function publishBalance() external {
    require(block.timestamp > lastPublishedTime + 1 days);
    lastPublishedBalance = address(this).balance;
    lastPublishedTime = block.timestamp;
}
}