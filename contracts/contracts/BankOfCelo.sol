// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title BankOfCelo
 * @notice A main-net faucet for Farcaster onboarding.
 *         – OGs donate CELO
 *         – Newcomers (one-time) claim up to MAX_CLAIM
 *
 * Security / abuse-mitigation knobs:
 *  - per-address + per-FID one-time claim
 *  - optional per-address cooldown window
 *  - blacklist for known spam FIDs
 *  - EOAs only (no contracts)
 *  - minVaultBalance gate so donations never run dry unexpectedly
 *
 * Off-chain service MUST:
 *  - verify msg.sender ↔️ FID ownership (Farcaster custody / onchain-address proof)
 *  - check Neynar score ≥ 0.41  OR  Warpcast spam label == 2
 *  - pass the verified FID into claim(fid)
 */
contract BankOfCelo is Ownable, ReentrancyGuard  {
    // --- config ------------------------------------------------------------
    uint256 public constant MAX_CLAIM = 0.5 ether;   // 0.5 CELO
    uint256 public immutable minVaultBalance;        // fail-safe floor

    // optional: enforce one claim every X seconds (default 0 = once forever)
    uint256 public claimCooldown = 0;

    // --- storage -----------------------------------------------------------
    mapping(address => uint256) public lastClaimAt;  // tracks cooldown
    mapping(address => bool)     public hasClaimed;  // one-time guard
    mapping(uint256  => bool)    public fidClaimed;  // FID ↔️ claim guard
    mapping(uint256  => bool)    public fidBlacklisted; // spam list

    mapping(address => uint256) public donorTotals;  // donor accounting

    // --- events ------------------------------------------------------------
    event Donated(address indexed donor, uint256 amount);
    event Claimed(address indexed recipient, uint256 fid, uint256 amount);
    event BlacklistUpdated(uint256[] fids, bool isBlacklisted);

    /* ---------- constructor ---------- */
    /// @param _minVaultBalance safety floor the owner can’t sweep below
    constructor(uint256 _minVaultBalance)
        payable
        Ownable(msg.sender)          // 👈 pass the initial owner
    {
        minVaultBalance = _minVaultBalance;
    }

    // -----------------------------------------------------------------------
    // 🎁  Donors
    // -----------------------------------------------------------------------
    function donate() external payable nonReentrant {
        require(msg.value > 0, "Zero deposit");
        donorTotals[msg.sender] += msg.value;
        emit Donated(msg.sender, msg.value);
    }

    // -----------------------------------------------------------------------
    // 🌱  New-user faucet
    // -----------------------------------------------------------------------
    function claim(uint256 fid) external nonReentrant {
        // 1. basic guards ----------------------------------------------------
        require(tx.origin == msg.sender, "Contracts not allowed");
        require(!hasClaimed[msg.sender],  "Already claimed (address)");
        require(!fidClaimed[fid],         "Already claimed (FID)");
        require(!fidBlacklisted[fid],     "FID blacklisted");
        require(address(this).balance >= MAX_CLAIM + minVaultBalance,
                "Vault balance too low");

        // optional cooldown
        if (claimCooldown > 0) {
            require(
                block.timestamp - lastClaimAt[msg.sender] >= claimCooldown,
                "Cooldown not passed"
            );
        }

        // 2. effects ---------------------------------------------------------
        hasClaimed[msg.sender] = true;
        fidClaimed[fid]       = true;
        lastClaimAt[msg.sender] = block.timestamp;

        // 3. interactions ----------------------------------------------------
        (bool ok, ) = msg.sender.call{value: MAX_CLAIM}("");
        require(ok, "CELO transfer failed");

        emit Claimed(msg.sender, fid, MAX_CLAIM);
    }

    // -----------------------------------------------------------------------
    // 🔧  Admin knobs
    // -----------------------------------------------------------------------
    function setClaimCooldown(uint256 seconds_) external onlyOwner {
        claimCooldown = seconds_;
    }

    /// @notice Owner can batch-update spam labels pulled weekly from Warpcast.
    function updateBlacklist(uint256[] calldata fids, bool isBlacklisted) external onlyOwner {
        for (uint256 i = 0; i < fids.length; ++i) {
            fidBlacklisted[fids[i]] = isBlacklisted;
        }
        emit BlacklistUpdated(fids, isBlacklisted);
    }

    /// @notice Emergency withdrawal for upgrading contracts / refunds.
    function sweep(address payable to, uint256 amount) external onlyOwner {
        require(
            address(this).balance - amount >= minVaultBalance,
            "Cannot sweep below min balance"
        );
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Sweep failed");
    }

    // Fallback to accept plain CELO transfers
    receive() external payable {
        donorTotals[msg.sender] += msg.value;
        emit Donated(msg.sender, msg.value);
    }
}
