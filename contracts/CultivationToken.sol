// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Fixed-supply project token used for holding thresholds and burn-address scroll upgrades.
contract CultivationToken is ERC20, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        require(owner_ != address(0), "owner is zero");
        _mint(owner_, initialSupply_);
    }
}
