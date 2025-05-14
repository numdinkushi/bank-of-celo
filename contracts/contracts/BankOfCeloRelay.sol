// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IBankOfCelo {
    function claim(uint256 fid) external;
}

contract BankOfCeloRelay is Ownable {
     IBankOfCelo public immutable bank;
    uint256 public gasFee; // Fee to cover gas costs only
    mapping(bytes32 => bool) public usedSignatures;
    
    event ClaimRelayed(address indexed user, uint256 fid, uint256 gasFee);
    
    constructor(address bankAddress, address initialOwner) Ownable(initialOwner) {
        bank = IBankOfCelo(bankAddress);
        gasFee = 0.001 ether; // Default gas fee (~0.001 CELO)
    }
    
    function relayClaim(
        address user,
        uint256 fid,
        uint256 maxGasFee,
        uint256 deadline,
        bytes memory signature
    ) external payable {
        require(block.timestamp <= deadline, "Transaction expired");
        require(msg.value >= gasFee, "Insufficient gas fee");
        require(msg.value <= maxGasFee, "Gas fee exceeds maximum");
        
        // Prevent signature reuse
        bytes32 signatureHash = keccak256(signature);
        require(!usedSignatures[signatureHash], "Signature already used");
        usedSignatures[signatureHash] = true;
        
        // Verify signature
        bytes32 hash = keccak256(abi.encodePacked(
            user, fid, maxGasFee, deadline, address(this)
        ));
        address signer = recoverSigner(hash, signature);
        require(signer == user, "Invalid signature");
        
        // Execute claim - BankOfCelo will send 0.5 CELO to this contract
        bank.claim(fid);
        
        // Forward the claimed amount to the user
        uint256 claimedAmount = 0.5 ether;
        (bool success, ) = user.call{value: claimedAmount}("");
        require(success, "Failed to forward CELO to user");
        
        // Refund any excess gas fee
        if (msg.value > gasFee) {
            (success, ) = msg.sender.call{value: msg.value - gasFee}("");
            require(success, "Failed to refund excess gas fee");
        }
        
        emit ClaimRelayed(user, fid, gasFee);
    }
    
    // Add this function to handle any remaining balance (shouldn't happen)
    function emergencyWithdraw(address payable to) external onlyOwner {
        to.transfer(address(this).balance);
    }
    
    function setGasFee(uint256 newGasFee) external onlyOwner {
        gasFee = newGasFee;
    }
    
    function withdrawFees(address payable to) external onlyOwner {
        to.transfer(address(this).balance);
    }
    
    function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(hash, v, r, s);
    }
    
    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}