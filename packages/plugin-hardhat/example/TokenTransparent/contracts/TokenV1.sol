// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title TokenV1
 * @dev Initial version of the token using Ownable for access control.
 * This contract will be upgraded to TokenV2 which uses AccessControl.
 */
contract TokenV1 is Initializable, ERC20Upgradeable, OwnableUpgradeable, ERC20PermitUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with an owner address.
     * @param initialOwner The address that will own the contract
     */
    function initialize(address initialOwner) public initializer {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init(initialOwner);
        __ERC20Permit_init("MyToken");
    }

    /**
     * @dev Mints tokens to a specified address. Only the owner can call this function.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

