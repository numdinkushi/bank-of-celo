// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfCircuitLibrary} from "@selfxyz/contracts/contracts/libraries/SelfCircuitLibrary.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract OGEarners is SelfVerificationRoot, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable celo;

    // Default: 100 Celo tokens
    uint256 public claimableAmount = 100 * 10**18; // Assuming 18 decimals for Celo

    mapping(uint256 => bool) internal _nullifiers;

    event CeloClaimed(address indexed claimer, uint256 amount);
    event ClaimableAmountUpdated(uint256 oldAmount, uint256 newAmount);

    error RegisteredNullifier();

    constructor(
        address _identityVerificationHub,
        uint256 _scope,
        uint256[] memory _attestationIds,
        address _token
    )
        SelfVerificationRoot(
            _identityVerificationHub,
            _scope,
            _attestationIds
        )
        Ownable(_msgSender())
    {
        celo = IERC20(_token);
    }

    function setVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory newVerificationConfig
    ) external onlyOwner {
        _setVerificationConfig(newVerificationConfig);
    }

    function setClaimableAmount(uint256 newAmount) external onlyOwner {
        uint256 oldAmount = claimableAmount;
        claimableAmount = newAmount;
        emit ClaimableAmountUpdated(oldAmount, newAmount);
    }

    function verifySelfProof(
        ISelfVerificationRoot.DiscloseCircuitProof memory proof
    )
        public
        override
    {
        if (_nullifiers[proof.pubSignals[NULLIFIER_INDEX]]) {
            revert RegisteredNullifier();
        }

        super.verifySelfProof(proof);

        _nullifiers[proof.pubSignals[NULLIFIER_INDEX]] = true;
        celo.safeTransfer(address(uint160(proof.pubSignals[USER_IDENTIFIER_INDEX])), claimableAmount);
        emit CeloClaimed(address(uint160(proof.pubSignals[USER_IDENTIFIER_INDEX])), claimableAmount);
    }

    function withdrawCelo(address to, uint256 amount) external onlyOwner {
        celo.safeTransfer(to, amount);
    }
}
