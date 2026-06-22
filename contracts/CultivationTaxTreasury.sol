// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBNBRewardVault {
    function depositRewards() external payable;
}

/// @notice Pre-launch treasury address for Four.meme tax receipts.
/// @dev Deploy this before creating the Four.meme token, use it as the royalty/tax wallet,
/// then route collected BNB into the scroll dividend contract after the token is live.
contract CultivationTaxTreasury is Ownable, ReentrancyGuard {
    address public rewardVault;
    uint256 public totalReceived;
    uint256 public totalRouted;

    event TaxReceived(address indexed sender, uint256 amount);
    event RewardVaultUpdated(address indexed rewardVault);
    event TaxRouted(address indexed caller, address indexed rewardVault, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error RewardVaultNotSet();
    error InsufficientBalance();

    constructor(address owner_) Ownable(owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
    }

    receive() external payable {
        _recordReceived();
    }

    fallback() external payable {
        if (msg.value > 0) {
            _recordReceived();
        }
    }

    function setRewardVault(address rewardVault_) external onlyOwner {
        if (rewardVault_ == address(0)) revert ZeroAddress();
        rewardVault = rewardVault_;
        emit RewardVaultUpdated(rewardVault_);
    }

    /// @notice Routes BNB into the configured dividend contract.
    /// @dev Pass 0 to route the full treasury balance. Callable by anyone after setup.
    function routeToRewardVault(uint256 amount) external nonReentrant {
        address vault = rewardVault;
        if (vault == address(0)) revert RewardVaultNotSet();

        uint256 balance = address(this).balance;
        uint256 routeAmount = amount == 0 ? balance : amount;
        if (routeAmount == 0) revert ZeroAmount();
        if (routeAmount > balance) revert InsufficientBalance();

        totalRouted += routeAmount;
        IBNBRewardVault(vault).depositRewards{value: routeAmount}();

        emit TaxRouted(msg.sender, vault, routeAmount);
    }

    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function _recordReceived() internal {
        if (msg.value == 0) revert ZeroAmount();
        totalReceived += msg.value;
        emit TaxReceived(msg.sender, msg.value);
    }
}
